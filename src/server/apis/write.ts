import { Request } from "express"
import { cloneDeep, difference, isEqual, uniqWith } from "lodash"
import { toSubscriptionKey } from "../../shared/PubSubKeys"
import * as t from "../../shared/dataTypes"
import { PermissionError, ValidationError } from "../../shared/errors"
import { getRecordMap, setRecordMap } from "../../shared/recordMapHelpers"
import {
	VersionMap,
	validateRecord,
	type RecordPointer,
	type RecordWithTable,
} from "../../shared/schema"
import { Transaction, applyOperation } from "../../shared/transaction"
import { getCurrentUserId } from "../helpers/getCurrentUserId"
import { loadRecordsWithPermissionRecords } from "../helpers/loadRecordsWithPermissionRecords"
import { validateWrite as validateWritePermission } from "../helpers/validateWrite"
import type { ServerEnvironment } from "../services/ServerEnvironment"

export const input: t.Validator<Transaction> = t.object({
	txId: t.uuid,
	authorId: t.uuid,
	operations: t.array(t.any),
})

export async function write(environment: ServerEnvironment, args: t.Infer<typeof input>) {
	const { txId, authorId, operations } = args

	const pointers = uniqWith(
		operations.map(({ table, id }) => ({ table, id }) as RecordPointer),
		isEqual
	)

	const beforeRecordMap = await loadRecordsWithPermissionRecords(environment, pointers)

	const afterRecordMap = cloneDeep(beforeRecordMap)

	// Keep track of the previous version so we can assert on write.
	const versionMap: VersionMap = {}
	for (const pointer of pointers) {
		const record = getRecordMap(afterRecordMap, pointer)
		if (record) setRecordMap(versionMap, pointer, record.version)
	}

	// Apply the mutations.
	for (const operation of operations) {
		applyOperation(afterRecordMap, operation)
	}

	// Validate all the record schemas.
	for (const pointer of pointers) {
		const record = getRecordMap(afterRecordMap, pointer) as any
		const error = validateRecord({ ...pointer, record })
		if (error) throw new ValidationError(t.formatError(error))
	}

	// Validate write permissions.
	if (authorId !== environment.config.adminUserId) {
		const errors = validateWritePermission({
			pointers,
			beforeRecordMap,
			afterRecordMap,
			userId: authorId,
		})

		if (errors.length > 0) {
			throw new PermissionError(errors.join("\n"))
		}
	}

	// Write to the database.
	// TODO: assert transactional reads as well.
	const records = pointers.map((pointer) => {
		const record: RecordWithTable = {
			...pointer,
			record: getRecordMap(afterRecordMap, pointer) as any,
		}
		return record
	})

	await environment.db.write(records, versionMap)

	// Ideally everything after this comment should be transactional but we can
	// settle with eventually consistent.

	// It is possible to return before successfully publishing version updates.
	setImmediate(() => {
		// This is also not bulletproof in terms of concurrency, but that's fine because
		// an out-of-order version publication will be ignored since it will be lower.
		environment.pubsub.publish(
			records.map(({ table, id, record: { version } }) => {
				return {
					key: toSubscriptionKey({ type: "getRecord", pointer: { table, id } }),
					value: version,
				}
			})
		)
	})

	// Publish getMessages updates.
	setImmediate(() => {
		const threadIds = new Set<string>()

		for (const pointer of pointers) {
			if (pointer.table !== "message") continue
			const after = getRecordMap(afterRecordMap, pointer)
			const before = getRecordMap(beforeRecordMap, pointer)
			const created = after && !before
			if (!created) continue
			threadIds.add(after.thread_id)
		}

		environment.pubsub.publish(
			Array.from(threadIds).map((threadId) => ({
				key: toSubscriptionKey({ type: "getMessages", threadId }),
				value: txId,
			}))
		)
	})

	// Publish getThreads updates.
	setImmediate(() => {
		const userIds = new Set<string>()

		for (const pointer of pointers) {
			if (pointer.table !== "thread") continue
			const after = getRecordMap(afterRecordMap, pointer)
			const before = getRecordMap(beforeRecordMap, pointer)

			// Change in permission
			const newMemberIds = difference(after?.member_ids || [], before?.member_ids || [])
			const oldMemberIds = difference(before?.member_ids || [], after?.member_ids || [])
			for (const userId of newMemberIds) userIds.add(userId)
			for (const userId of oldMemberIds) userIds.add(userId)

			// Change in replied_at which could reorder the list.
			if (before?.replied_at !== after?.replied_at) {
				if (before) for (const userId of before.member_ids) userIds.add(userId)
				if (after) for (const userId of after.member_ids) userIds.add(userId)
			}
		}

		environment.pubsub.publish(
			Array.from(userIds).map((userId) => ({
				key: toSubscriptionKey({ type: "getThreads", userId }),
				value: txId,
			}))
		)
	})

	// Return records because they might contain data from another user.
	return { recordMap: afterRecordMap }
}

export async function handler(
	environment: ServerEnvironment,
	args: t.Infer<typeof input>,
	req: Request
) {
	const { authorId } = args
	const userId = await getCurrentUserId(environment, req)
	if (authorId !== userId) throw new PermissionError("User must be author of transaction.")
	return write(environment, args)
}
