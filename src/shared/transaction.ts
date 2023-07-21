import { cloneDeep, isEqual, set, update } from "lodash"
import { ValidationError } from "./errors"
import { getRecordMap, setRecordMap } from "./recordMapHelpers"
import { RecordMap, RecordPointer, RecordTable, TableToRecord } from "./schema"

export type SetOperation = {
	type: "set"
	table: string
	id: string
	key: string[]
	value: any
}

export type ListInsertOperation = {
	type: "listInsert"
	table: string
	id: string
	key: string[]
	value: any
	// Defaults to append
	where?: "prepend" | "append" | { before: any } | { after: any }
}

export type ListRemoveOperation = {
	type: "listRemove"
	table: string
	id: string
	key: string[]
	value: any
}

export type Operation = SetOperation | ListInsertOperation | ListRemoveOperation

export type Transaction = { txId: string; authorId: string; operations: Operation[] }

export type AutoField = "version" | "last_version"

function createOp<T extends RecordTable>(table: T, value: TableToRecord[T]) {
	return {
		type: "set",
		table,
		id: value.id,
		key: [],
		value: value,
	} as SetOperation
}

function updateOp<T extends RecordTable, K extends keyof Omit<TableToRecord[T], "id" | AutoField>>(
	pointer: RecordPointer<T>,
	key: K,
	value: TableToRecord[T][K]
) {
	return {
		type: "set",
		...pointer,
		key: [key],
		value: value,
	} as SetOperation
}

// Helper functions to enforce better types.
// TODO: doesnt work great.
export const op = {
	create: createOp,
	update: updateOp,
	// insert: insertOp,
	// remove: removeOp,
}

export function applyOperation(recordMap: RecordMap, operation: Operation) {
	if (operation.type === "set") return applySetOperation(recordMap, operation)
	if (operation.type === "listInsert") return applyListInsertOperation(recordMap, operation)
	if (operation.type === "listRemove") return applyListRemoveOperation(recordMap, operation)
	throw new ValidationError("Unknown operation type.")
}

function applySetOperation(recordMap: RecordMap, operation: SetOperation) {
	const { table, id } = operation
	const pointer = { table, id } as RecordPointer

	const record = getRecordMap(recordMap, pointer)

	if (!record) {
		if (operation.key.length !== 0) throw new ValidationError("Record does not exist.")

		const record = { ...operation.value, version: 1 }
		setRecordMap(recordMap, pointer, record)
		return
	}

	const newRecord = cloneDeep(record)
	set(newRecord, operation.key, operation.value)
	newRecord.version += 1
	setRecordMap(recordMap, pointer, newRecord)
}

function applyListInsertOperation(recordMap: RecordMap, operation: ListInsertOperation) {
	const { table, id, value, where } = operation
	const pointer = { table, id } as RecordPointer

	const record = getRecordMap(recordMap, pointer)
	if (!record) throw new ValidationError("Record does not exist.")

	const newRecord = cloneDeep(record)
	update(newRecord, operation.key, (list) => {
		if (list === null || list === undefined) {
			return [value]
		}
		if (Array.isArray(list)) {
			// Disallow duplicate items in a list.
			list = list.filter((item) => item !== value)

			if (where === undefined || where === "append") {
				return [...list, value]
			}
			if (where === "prepend") {
				return [value, ...list]
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
	setRecordMap(recordMap, pointer, newRecord)
}

function indexOf<T>(list: T[], value: T) {
	for (let i = 0; i < list.length; i++) {
		if (isEqual(list[i], value)) return i
	}
	return -1
}

function applyListRemoveOperation(recordMap: RecordMap, operation: ListRemoveOperation) {
	const { table, id, value } = operation
	const pointer = { table, id } as RecordPointer

	const record = getRecordMap(recordMap, pointer)
	if (!record) throw new ValidationError("Record does not exist.")

	const newRecord = cloneDeep(record)
	update(newRecord, operation.key, (list) => {
		if (list === null || list === undefined) {
			return list
		}
		if (Array.isArray(list)) {
			return list.filter((item) => item !== value)
		}
		throw new ValidationError("Cannot remove from a non-list.")
	})
	newRecord.version += 1
	setRecordMap(recordMap, pointer, newRecord)
}
