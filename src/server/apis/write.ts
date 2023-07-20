import * as t from "data-type-ts"
import { cloneDeep, difference, isEqual, uniqWith } from "lodash"
import { PermissionError } from "../../shared/errors"
import { getRecordMap, iterateRecordMap } from "../../shared/recordMapHelpers"
import type { RecordPointer, RecordWithTable } from "../../shared/schema"
import { Operation, Transaction, applyOperation } from "../../shared/transaction"
import type { ServerEnvironment } from "../ServerEnvironment"
import type { ApiEndpoint } from "../api"
import { loadRecordsWithAncestors } from "../loadRecordsWithAncestors"
import { validateWrite as validateWritePermission } from "../validateWrite"

export const input = t.obj<Transaction>({
	authorId: t.string,
	operations: t.array(t.any),
})

export async function write(environment: ServerEnvironment, args: typeof input.value) {
	const { authorId, operations } = args

	const pointers = uniqWith(
		operations.map(({ table, id }) => ({ table, id } as RecordPointer)),
		isEqual
	)

	const beforeRecordMap = await loadRecordsWithAncestors(environment, pointers)

	const afterRecordMap = cloneDeep(beforeRecordMap)

	// Keep track of the previous version so we can assert on write.
	for (const pointer of pointers) {
		const record = getRecordMap(afterRecordMap, pointer)
		if (record) record.last_version = record.version
	}

	// Apply the mutations.
	for (const operation of operations) {
		applyOperation(afterRecordMap, operation)
	}

	// TODO: validate all the record schemas.

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
	const records = pointers.map((pointer) => {
		const record: RecordWithTable = {
			...pointer,
			record: getRecordMap(afterRecordMap, pointer) as any,
		}
		return record
	})

	await environment.db.write(records)

	// TODO: ideally everything after this comment should be transactional but we can
	// settle with eventually consistent.

	// It is possible to return before successfully publishing version updates.
	setImmediate(() => {
		// This is also not bulletproof in terms of concurrency, but that's fine because
		// an out-of-order version publication will be ignored since it will be lower.
		environment.pubsub.publish(
			records.map(({ table, id, record: { version } }) => ({
				key: [table, id].join(":"),
				value: version,
			}))
		)
	})

	// Publish getMessages updates.
	setImmediate(() => {
		const threadIds = new Set<string>()

		for (const { table, id, record: after } of iterateRecordMap(afterRecordMap)) {
			if (table !== "message") return
			const before = getRecordMap(beforeRecordMap, { table, id })
			const created = after && !before
			if (!created) return
			threadIds.add(after.thread_id)
		}

		environment.pubsub.publish(
			Array.from(threadIds).map((threadId) => ({
				key: ["getMessages", threadId].join(":"),
				// TODO: think of a clever stable version scheme to use here.
				// Perhaps the last created record id?
				value: Math.random(),
			}))
		)
	})

	// Denormalization.
	setImmediate(async () => {
		const operations: Operation[] = []

		for (const pointer of pointers) {
			if (pointer.table !== "thread") continue
			const prev = getRecordMap(beforeRecordMap, pointer)
			const next = getRecordMap(afterRecordMap, pointer)

			const prevMembers = prev ? prev.member_ids || [] : []
			const nextMembers = next ? next.member_ids || [] : []

			const addMembers = difference(nextMembers, prevMembers)
			const removeMembers = difference(prevMembers, nextMembers)

			for (const userId of addMembers) {
				operations.push({
					type: "listInsert",
					table: "user_settings",
					id: userId,
					key: ["thread_ids"],
					value: pointer.id,
				})
			}
			for (const userId of removeMembers) {
				operations.push({
					type: "listRemove",
					table: "user_settings",
					id: userId,
					key: ["thread_ids"],
					value: pointer.id,
				})
			}
		}

		if (operations.length !== 0) {
			// TODO: retry on transaction conflict!
			await write(environment, { authorId: environment.config.adminUserId, operations })
		}
	})

	// Return records because they might contain data from another user.
	return { recordMap: afterRecordMap }
}

export type writeApiType = {
	input: typeof input.value
	output: ReturnType<typeof write>
}

export const writeApi: ApiEndpoint = {
	validate: (body) => {
		const error = input.validate(body)
		if (error) return t.formatError(error)
	},
	action: write,
}
