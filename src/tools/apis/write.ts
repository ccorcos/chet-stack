import * as t from "data-type-ts"
import { cloneDeep, isEqual, set, uniqWith, update } from "lodash"
import { getRecordMap, setRecordMap } from "../../shared/recordMapHelpers"
import type {
	RecordMap,
	RecordPointer,
	RecordWithTable,
} from "../../shared/schema"
import {
	InsertOperation,
	Operation,
	RemoveOperation,
	SetOperation,
	Transaction,
} from "../../shared/transaction"
import type { ApiEndpoint } from "../api"
import { ValidationError } from "../errors"
import type { ServerEnvironment } from "../ServerEnvironment"

export const input = t.obj<Transaction>({
	authorId: t.string,
	operations: t.array(t.any),
})

export async function write(
	environment: ServerEnvironment,
	args: typeof input.value
) {
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

function applyOperation(recordMap: RecordMap, operation: Operation) {
	if (operation.type === "set") return applySetOperation(recordMap, operation)
	if (operation.type === "insert")
		return applyInsertOperation(recordMap, operation)
	if (operation.type === "remove")
		return applyRemoveOperation(recordMap, operation)
	throw new ValidationError("Unknown operation type.")
}

function applySetOperation(recordMap: RecordMap, operation: SetOperation) {
	const { table, id } = operation
	const pointer = { table, id } as RecordPointer

	const record: any = getRecordMap(recordMap, pointer)

	if (!record) {
		if (operation.key.length !== 0)
			throw new ValidationError("Record does not exist.")

		const record = { ...operation.value, version: 1 }
		setRecordMap(recordMap, pointer, record)
		return
	}

	const newRecord = cloneDeep(record)
	set(newRecord, operation.key, operation.value)
	newRecord.version += 1
}

function applyInsertOperation(
	recordMap: RecordMap,
	operation: InsertOperation
) {
	const { table, id, value, where } = operation
	const pointer = { table, id } as RecordPointer

	const record: any = getRecordMap(recordMap, pointer)
	if (!record) throw new ValidationError("Record does not exist.")

	const newRecord = cloneDeep(record)
	update(newRecord, operation.key, (list) => {
		if (list === null || list === undefined) {
			return [value]
		}
		if (Array.isArray(list)) {
			if (where === "prepend") {
				return [value, ...list]
			}
			if (where === "append") {
				return [...list, value]
			}
			if ("before" in where) {
				const i = indexOf(list, where.before)
				if (i === -1) return [value, ...list]
				return [...list.slice(0, i), value, ...list.slice(i)]
			}
			if ("after" in where) {
				const i = indexOf(list, where.after)
				if (i === -1) return [...list, value]
				return [...list.slice(0, i + 1), value, ...list.slice(i + 1)]
			}
		}
		throw new ValidationError("Cannot insert on a non-list.")
	})
	newRecord.version += 1
}

function indexOf<T>(list: T[], value: T) {
	for (let i = 0; i < list.length; i++) {
		if (isEqual(list[i], value)) return i
	}
	return -1
}

function applyRemoveOperation(
	recordMap: RecordMap,
	operation: RemoveOperation
) {
	const { table, id, value } = operation
	const pointer = { table, id } as RecordPointer

	const record: any = getRecordMap(recordMap, pointer)
	if (!record) throw new ValidationError("Record does not exist.")

	const newRecord = cloneDeep(record)
	update(newRecord, operation.key, (list) => {
		if (list === null || list === undefined) {
			return list
		}
		if (Array.isArray(list)) {
			return list.filter((item) => !isEqual(item, value))
		}
		throw new ValidationError("Cannot remove on a non-list.")
	})
	newRecord.version += 1
}
