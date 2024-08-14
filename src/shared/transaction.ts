import { cloneDeep, get, isEqual, set, update } from "lodash"
import { ValidationError } from "./errors"
import { getRecordMap, setRecordMap } from "./recordMapHelpers"
import { RecordMap, RecordPointer, RecordTable, TableToRecord, canDeleteTables } from "./schema"

export type SetOperation = {
	type: "set"
	table: string
	id: string
	key: string[]
	value: any
	serverOnly?: boolean
}

export type SetNowOperation = {
	type: "set-now"
	table: string
	id: string
	key: string[]
	serverOnly?: boolean
}

export type ListInsertOperation = {
	type: "listInsert"
	table: string
	id: string
	key: string[]
	value: any
	// Defaults to append
	where?: "prepend" | "append" | { before: any } | { after: any }
	serverOnly?: boolean
}

export type ListRemoveOperation = {
	type: "listRemove"
	table: string
	id: string
	key: string[]
	value: any
	serverOnly?: boolean
}

export type Operation = SetOperation | SetNowOperation | ListInsertOperation | ListRemoveOperation

export type Transaction = { txId: string; authorId: string; operations: Operation[] }

export type AutoField = "version"

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
export const op = {
	create: createOp,
	update: updateOp,
	// insert: insertOp,
	// remove: removeOp,
}

export function applyOperation(recordMap: RecordMap, operation: Operation) {
	if (operation.type === "set") return applySetOperation(recordMap, operation)
	if (operation.type === "set-now") return applySetNowOperation(recordMap, operation)
	if (operation.type === "listInsert") return applyListInsertOperation(recordMap, operation)
	if (operation.type === "listRemove") return applyListRemoveOperation(recordMap, operation)
	throw new ValidationError("Unknown operation type.")
}

export function invertOperation(recordMap: RecordMap, operation: Operation) {
	if (operation.type === "set") return invertSetOperation(recordMap, operation)
	if (operation.type === "set-now") return invertSetNowOperation(recordMap, operation)
	if (operation.type === "listInsert") return invertListInsertOperation(recordMap, operation)
	if (operation.type === "listRemove") return invertListRemoveOperation(recordMap, operation)
	throw new ValidationError("Unknown operation type.")
}

function applySetOperation(recordMap: RecordMap, operation: SetOperation) {
	const { table, id, key } = operation
	const pointer = { table, id } as RecordPointer

	const record = getRecordMap(recordMap, pointer)

	if (!record) {
		if (key.length !== 0) throw new ValidationError("Record does not exist.")

		const record = { ...operation.value, version: 1 }
		setRecordMap(recordMap, pointer, record)
		return
	}

	const newRecord = cloneDeep(record)
	set(newRecord, key, operation.value)
	newRecord.version += 1
	setRecordMap(recordMap, pointer, newRecord)
}

function applySetNowOperation(recordMap: RecordMap, operation: SetNowOperation) {
	const { table, id, key } = operation
	const pointer = { table, id } as RecordPointer

	const record = getRecordMap(recordMap, pointer)

	if (key.length === 0) throw new ValidationError("set-now operation requires a key")
	if (!record) throw new ValidationError("Record does not exist.")

	if (!record || key.length === 0) {
		throw new ValidationError("Nope.")
	}

	const newRecord = cloneDeep(record)
	set(newRecord, key, Date.now())
	newRecord.version += 1
	setRecordMap(recordMap, pointer, newRecord)
}

function invertSetOperation(recordMap: RecordMap, operation: SetOperation) {
	const { table, id, key } = operation
	const pointer = { table, id } as RecordPointer

	const record = getRecordMap(recordMap, pointer)

	if (!record) {
		if (key.length !== 0) throw new ValidationError("Record does not exist.")

		// Create an object -> soft delete the object.
		if (!canDeleteTables[operation.table]) return

		const op: SetOperation = {
			type: "set",
			table,
			id,
			key: ["deleted"],
			value: true,
		}
		return op
	}

	const value = get(record, key)

	const op: SetOperation = {
		type: "set",
		table,
		id,
		key,
		value,
	}
	return op
}

function invertSetNowOperation(recordMap: RecordMap, operation: SetNowOperation) {
	const { table, id, key } = operation
	const pointer = { table, id } as RecordPointer

	const record = getRecordMap(recordMap, pointer)

	if (key.length === 0) throw new ValidationError("set-now operation requires a key")
	if (!record) return

	const value = get(record, key)
	const op: SetOperation = {
		type: "set",
		table,
		id,
		key,
		value,
	}
	return op
}

function applyListInsertOperation(recordMap: RecordMap, operation: ListInsertOperation) {
	const { key, table, id, value, where } = operation
	const pointer = { table, id } as RecordPointer

	const record = getRecordMap(recordMap, pointer)
	if (!record) throw new ValidationError("Record does not exist.")

	const newRecord = cloneDeep(record)
	update(newRecord, key, (list) => {
		if (list === null || list === undefined) {
			return [value]
		}
		if (Array.isArray(list)) {
			// Disallow duplicate items in a list so that this function is idempotent!
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

function invertListInsertOperation(recordMap: RecordMap, operation: ListInsertOperation) {
	const { type, key, table, id, value, where } = operation
	const pointer = { table, id } as RecordPointer

	const record = getRecordMap(recordMap, pointer)
	if (!record) throw new ValidationError("Record does not exist.")

	const list = get(record, key)

	if (Array.isArray(list)) {
		const index = list.indexOf(value)
		// Restore position in the list.
		if (index !== -1) {
			if (index === 0) {
				const op: ListInsertOperation = {
					type,
					key,
					table,
					id,
					value,
					where: "prepend",
				}
				return op
			} else {
				const prev = list[index - 1]
				const op: ListInsertOperation = {
					type,
					key,
					table,
					id,
					value,
					where: { after: prev },
				}
				return op
			}
		}
	}

	// Remove from the list.
	const op: ListRemoveOperation = {
		type: "listRemove",
		key,
		table,
		id,
		value,
	}
	return op
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

function invertListRemoveOperation(recordMap: RecordMap, operation: ListRemoveOperation) {
	const { key, table, id, value } = operation
	const pointer = { table, id } as RecordPointer

	const record = getRecordMap(recordMap, pointer)
	if (!record) throw new ValidationError("Record does not exist.")

	const list = get(record, key)

	if (Array.isArray(list)) {
		const index = list.indexOf(value)
		// Restore position in the list.
		if (index !== -1) {
			if (index === 0) {
				const op: ListInsertOperation = {
					type: "listInsert",
					key,
					table,
					id,
					value,
					where: "prepend",
				}
				return op
			} else {
				const prev = list[index - 1]
				const op: ListInsertOperation = {
					type: "listInsert",
					key,
					table,
					id,
					value,
					where: { after: prev },
				}
				return op
			}
		}
	}
}

export function squashOperations(operations: Operation[]) {
	const squashed: Operation[] = []

	const keys = new Set<string>()
	for (let i = operations.length - 1; i >= 0; i--) {
		const op = operations[i]
		if (op.type !== "set") continue
		const key = JSON.stringify([op.table, op.id, ...op.key])
		if (keys.has(key)) continue

		keys.add(key)
		squashed.unshift(op)
	}

	return squashed
}
