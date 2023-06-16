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

export type InsertOperation = {
	type: "insert"
	table: string
	id: string
	key: string[]
	value: any
	where: "prepend" | "append" | { before: any } | { after: any }
}

export type RemoveOperation = {
	type: "remove"
	table: string
	id: string
}

export type Operation = SetOperation | InsertOperation
// | RemoveOperation

export type Transaction = { authorId: string; operations: Operation[] }

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

function removeOp<T extends RecordTable>(pointer: RecordPointer<T>) {
	return {
		type: "remove",
		...pointer,
	} as RemoveOperation
}

export const op = {
	create: createOp,
	update: updateOp,

	// Deleting a record poses an issue with transactionality...
	// remove: removeOp,
}

export function applyOperation(recordMap: RecordMap, operation: Operation) {
	if (operation.type === "set") return applySetOperation(recordMap, operation)
	if (operation.type === "insert") return applyInsertOperation(recordMap, operation)
	// if (operation.type === "remove") return applyRemoveOperation(recordMap, operation)
	throw new ValidationError("Unknown operation type.")
}

function applySetOperation(recordMap: RecordMap, operation: SetOperation) {
	const { table, id } = operation
	const pointer = { table, id } as RecordPointer

	const record: any = getRecordMap(recordMap, pointer)

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

function applyInsertOperation(recordMap: RecordMap, operation: InsertOperation) {
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
	setRecordMap(recordMap, pointer, newRecord)
}

function indexOf<T>(list: T[], value: T) {
	for (let i = 0; i < list.length; i++) {
		if (isEqual(list[i], value)) return i
	}
	return -1
}

// function applyRemoveOperation(recordMap: RecordMap, operation: RemoveOperation) {
// 	const { table, id } = operation
// 	const pointer = { table, id } as RecordPointer

// 	const record: any = getRecordMap(recordMap, pointer)
// 	if (!record) throw new ValidationError("Record does not exist.")

// 	const newRecord = cloneDeep(record)
// 	update(newRecord, operation.key, (list) => {
// 		if (list === null || list === undefined) {
// 			return list
// 		}
// 		if (Array.isArray(list)) {
// 			return list.filter((item) => !isEqual(item, value))
// 		}
// 		throw new ValidationError("Cannot remove on a non-list.")
// 	})
// 	newRecord.version += 1
// }
