import { RecordPointer, RecordTable, TableToRecord } from "./schema"

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
