import * as t from "data-type-ts"
import { cloneDeep, isEqual, uniqWith } from "lodash"
import { getRecordMap } from "../../shared/recordMapHelpers"
import type { RecordPointer, RecordWithTable } from "../../shared/schema"
import { applyOperation, Transaction } from "../../shared/transaction"
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

	// It is possible to return before successfully publishing version updates.
	// setImmediate(async () => {
	// This is also not bulletproof in terms of concurrency, but that's fine because
	// an out-of-order version publication will be ignored since it will be lower.
	await environment.pubsub.publish(
		records.map(({ table, id, record: { version } }) => ({
			key: [table, id].join(":"),
			value: version,
		}))
	)
	// })

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
