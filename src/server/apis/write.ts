import * as t from "data-type-ts"
import { cloneDeep, difference, isEqual, uniqWith } from "lodash"
import { assertPermissions } from "../Permissions"
import { getRecordMap, getRecordPointer } from "../../shared/recordMapHelpers"
import type { RecordWithTable, ThreadRecord } from "../../shared/schema"
import { applyOperation, Operation, Transaction } from "../../shared/transaction"
import type { ApiEndpoint } from "../api"
import type { ServerEnvironment } from "../ServerEnvironment"

export const input = t.obj<Transaction>({
	authorId: t.string,
	operations: t.array(t.any as t.RuntimeDataType<Operation>),
})

export async function write(environment: ServerEnvironment, args: typeof input.value) {
	const { db } = environment

	const { authorId, operations } = args

	const pointers = uniqWith(operations.map(getRecordPointer), isEqual)

	const recordMapBeforeChanges = await db.getRecords(pointers)

	const recordMapAfterChanges = cloneDeep(recordMapBeforeChanges)

	// Keep track of the previous version so we can assert on write.
	for (const pointer of pointers) {
		const record: any = getRecordMap(recordMapAfterChanges, pointer)
		if (record) record.last_version = record.version
	}

	// Apply the mutations.
	for (const operation of operations) {
		applyOperation(recordMapAfterChanges, operation)
	}

	// TODO: validate all the record schemas.

	await assertPermissions({
		environment,
		userId: authorId,
		recordMapBeforeChanges,
		recordMapAfterChanges,
		pointers,
	})

	// Write to the database.
	const records = pointers.map((pointer) => {
		const record: RecordWithTable = {
			...pointer,
			record: getRecordMap(recordMapAfterChanges, pointer) as any,
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

	// Denormalization.
	setImmediate(async () => {
		const operations: Operation[] = []

		for (const pointer of pointers) {
			if (pointer.table !== "thread") continue
			const prev = getRecordMap(recordMapBeforeChanges, pointer) as ThreadRecord | undefined
			const next = getRecordMap(recordMapAfterChanges, pointer) as ThreadRecord | undefined

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

		if (operations.length === 0) return

		// TODO: retry on transaction conflict!
		await write(environment, { authorId: environment.config.adminUserId, operations })
	})

	// Return records because they might contain data from another user.
	return { recordMap: recordMapAfterChanges }
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
