/*

Adds a record layer on top of TupleDb.

*/

import * as t from "../DataType"
import { formatError, validate } from "../DataType"
import { reifyFn } from "../reifyFn"
import { readOnlyTupleDb, transact, tupleDb } from "./TupleDb"
import { BaseTupleOKV, ReadOnlyTupleDb, TupleTx } from "./types"

const TableDefSchema = t.object({
	table: t.string,
	dataType: t.dataType,
})

// Cannot infer dataType because its recursive.
// export type TableDef = t.InferType<typeof TableDefSchema>
export type TableDef = { table: string; dataType: t.DataType }

const IndexDefSchema = t.object({
	table: t.string,
	name: t.string,
	fn: t.string,
})

export type IndexDef = t.InferType<typeof IndexDefSchema>

export type IndexFn = (value: any) => undefined | any[] | Generator<any[]>
export type IndexDefArgs = { table: string; name: string; fn: IndexFn }

export const setTable = transact((tx, tableDef: TableDef) => {
	const error = validate(TableDefSchema, tableDef)
	if (error) throw new Error(`Invalid table schema: ${formatError(error)}`)

	// Overwrite any existing table. It's up to the developer to ensure backwards compatible schema.
	tx.set(["model", "table", tableDef.table], tableDef)
})

export const deleteTable = transact((tx, table: string) => {
	// Delete all table indexes
	for (const { value } of tx.subspace(["model", "index", table]).list()) {
		const index = value as IndexDef
		deleteIndex(tx, index)
	}

	// Delete all table records
	const tableRecords = tx.subspace(["data", table])
	for (const { key } of tableRecords.list()) tableRecords.delete(key)

	// Delete table schema
	tx.delete(["model", "table", table])
})

export const hasIndex = (db: ReadOnlyTupleDb, args: { table: string; name: string }) => {
	return db.has(["model", "index", args.table, args.name])
}

export const createIndex = transact((tx, args: IndexDefArgs) => {
	const indexDef: IndexDef = { ...args, fn: args.fn.toString() }
	const error = validate(IndexDefSchema, indexDef)
	if (error) throw new Error(`Invalid index schema: ${formatError(error)}`)

	if (hasIndex(tx, indexDef)) throw new Error(`Index ${indexDef.name} already exists`)

	tx.set(["model", "index", indexDef.table, indexDef.name], indexDef)
	buildIndex(tx, args)
})

const buildIndex = transact((tx, args: IndexDefArgs) => {
	for (const { value } of tx.subspace(["data", args.table]).list()) indexRecord(tx, args, value)
})

const indexRecord = transact((tx, args: IndexDefArgs, record: any) => {
	const indexKeys = args.fn(record)
	if (!indexKeys) return
	if (Array.isArray(indexKeys)) {
		tx.set(["data", [args.table, args.name].join("."), ...indexKeys], null)
		return
	}
	for (const indexKey of indexKeys) {
		tx.set(["data", [args.table, args.name].join("."), indexKey], null)
	}
})

export const deleteIndex = transact((tx, args: { table: string; name: string }) => {
	unbuildIndex(tx, args)
	tx.delete(["model", "index", args.table, args.name])
})

const unbuildIndex = transact((tx, args: { table: string; name: string }) => {
	const index: IndexDef | undefined = tx.get(["model", "index", args.table, args.name])
	if (!index) throw new Error(`Index ${args.name} not found`)
	const fn = reifyFn(index.fn) as IndexFn

	for (const { value } of tx.subspace(["data", args.table]).list())
		unindexRecord(tx, { ...args, fn }, value)
})

const unindexRecord = transact((tx, args: IndexDefArgs, record: any) => {
	const indexKeys = args.fn(record)
	if (!indexKeys) return
	if (Array.isArray(indexKeys)) {
		tx.delete(["data", [args.table, args.name].join("."), ...indexKeys])
		return
	}
	for (const indexKey of indexKeys) {
		tx.delete(["data", [args.table, args.name].join("."), indexKey])
	}
})

const validateRecord = transact((tx, record: any, strict = true) => {
	if (!record.table) throw new Error("Record must have a table")
	if (!record.id) throw new Error("Record must have an id")

	const schema = tx.get(["model", "table", record.table])
	if (!schema) {
		if (strict) throw new Error(`Table schema ${record.table} not found`)
		else console.warn(`Table schema ${record.table} not found`)
	} else {
		const error = validate(schema.dataType, record)
		if (error) throw new Error(`Invalid ${record.table} record: ${formatError(error)}`)
	}
})

export const setRecord = transact((tx, record: any, strict = true) => {
	validateRecord(tx, record, strict)

	// Overwrite.
	deleteRecord(tx, record)
	tx.set(["data", record.table, record.id], record)

	// Run the indexers.
	for (const { value } of tx.subspace(["model", "index", record.table]).list()) {
		const index: IndexDef = value
		const fn = reifyFn(value.fn) as IndexFn
		indexRecord(tx, { ...index, fn }, record)
	}
})

export const deleteRecord = transact((tx, args: { table: string; id: string }) => {
	const existing = tx.get(["data", args.table, args.id])
	if (!existing) return

	for (const { value } of tx.subspace(["model", "index", args.table]).list()) {
		const index: IndexDef = value
		const fn = reifyFn(value.fn) as IndexFn
		unindexRecord(tx, { ...index, fn }, existing)
	}

	tx.delete(["data", args.table, args.id])
})

// TODO:
// - id doesnt have to be a string.

export type RecordDb = {
	setTable: (tableDef: TableDef) => void
	deleteTable: (table: string) => void
	createIndex: (indexDef: IndexDefArgs) => void
	deleteIndex: (args: { table: string; name: string }) => void
	setRecord: (record: any, strict?: boolean) => void
	deleteRecord: (args: { table: string; id: string }) => void

	model: ReadOnlyTupleDb
	data: ReadOnlyTupleDb

	transact: () => RecordTx
}

export type RecordTx = {
	setTable: (tableDef: TableDef) => void
	deleteTable: (table: string) => void
	createIndex: (indexDef: IndexDefArgs) => void
	deleteIndex: (args: { table: string; name: string }) => void
	setRecord: (record: any, strict?: boolean) => void
	deleteRecord: (args: { table: string; id: string }) => void

	model: ReadOnlyTupleDb
	data: ReadOnlyTupleDb

	committed: boolean
	commit: () => void
}

export function recordDb(base: BaseTupleOKV, dbStrict = true): RecordDb {
	const db = tupleDb(base)
	const recordDb: RecordDb = {
		setTable: (args) => setTable(db, args),
		deleteTable: (args) => deleteTable(db, args),
		createIndex: (args) => createIndex(db, args),
		deleteIndex: (args) => deleteIndex(db, args),
		setRecord: (args, strict) => setRecord(db, args, strict === undefined ? dbStrict : strict),
		deleteRecord: (args) => deleteRecord(db, args),
		model: readOnlyTupleDb(db.subspace(["model"])),
		data: readOnlyTupleDb(db.subspace(["data"])),
		transact: () => recordTx(db.transact(), dbStrict),
	}
	return recordDb
}

export function recordTx(tx: TupleTx, dbStrict = true): RecordTx {
	const recordTx: RecordTx = {
		setTable: (args) => setTable(tx, args),
		deleteTable: (args) => deleteTable(tx, args),
		createIndex: (args) => createIndex(tx, args),
		deleteIndex: (args) => deleteIndex(tx, args),
		setRecord: (args, strict) => setRecord(tx, args, strict === undefined ? dbStrict : strict),
		deleteRecord: (args) => deleteRecord(tx, args),
		model: readOnlyTupleDb(tx.subspace(["model"])),
		data: readOnlyTupleDb(tx.subspace(["data"])),
		get committed() {
			return tx.committed
		},
		commit: tx.commit,
	}

	return recordTx
}
