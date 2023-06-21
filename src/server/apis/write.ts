import * as t from "data-type-ts"
import { cloneDeep, difference, isEqual, uniqWith } from "lodash"
import { getRecordMap } from "../../shared/recordMapHelpers"
import type { RecordPointer, RecordWithTable, ThreadRecord } from "../../shared/schema"
import { applyOperation, Operation, Transaction } from "../../shared/transaction"
import type { ApiEndpoint } from "../api"
import type { ServerEnvironment } from "../ServerEnvironment"

export const input = t.obj<Transaction>({
	authorId: t.string,
	operations: t.array(t.any),
})

export async function write(environment: ServerEnvironment, args: typeof input.value) {
	const { db } = environment

	const { authorId, operations } = args

	const pointers = uniqWith(
		operations.map(({ table, id }) => ({ table, id } as RecordPointer)),
		isEqual
	)

	const originalRecordMap = await db.getRecords(pointers)

	const recordMap = cloneDeep(originalRecordMap)

	// Keep track of the previous version so we can assert on write.
	for (const pointer of pointers) {
		const record: any = getRecordMap(recordMap, pointer)
		if (record) record.last_version = record.version
	}

	// Apply the mutations.
	for (const operation of operations) {
		applyOperation(recordMap, operation)
	}

	// TODO: validate all the record schemas.
	// TODO: validate permissions by comparing the recordMaps.

	// Write to the database.
	const records = pointers.map((pointer) => {
		const record: RecordWithTable = {
			...pointer,
			record: getRecordMap(recordMap, pointer) as any,
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
			const prev = getRecordMap(originalRecordMap, pointer) as ThreadRecord | undefined
			const next = getRecordMap(recordMap, pointer) as ThreadRecord | undefined

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

		// TODO: retry on transaction conflict!
		await write(environment, { authorId: environment.config.adminUserId, operations })
	})

	// Return records because they might contain data from another user.
	return { recordMap }
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
