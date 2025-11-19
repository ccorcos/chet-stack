/*

Adds a record layer on top of TupleDb.

RecordDb is fundamentally different because all of the writes must go through
setRecord and deleteRecord.

Principle: records must be able to identify themselves (e.g. include table and id).

*/

import * as t from "shared/DataType"
import { formatError, validate } from "shared/DataType"
import { reifyFn } from "shared/reifyFn"
import { readOnlyTupleDb, tupleDb } from "./TupleDb"
import { ReadOnlyTupleDb, TupleDb, TupleOkv } from "./types"

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

export const setTable = (db: TupleDb, tableDef: TableDef) => {
	const error = validate(TableDefSchema, tableDef)
	if (error) throw new Error(`Invalid table schema: ${formatError(error)}`)

	// Overwrite any existing table. It's up to the developer to ensure backwards compatible schema.
	db.set(["model", "table", tableDef.table], tableDef)
}

export const hasTable = (db: ReadOnlyTupleDb, table: string) => {
	return db.has(["model", "table", table])
}

export const deleteTable = (db: TupleDb, table: string) => {
	// Delete all table indexes
	for (const { value } of db.subspace(["model", "index", table]).list()) {
		const index = value as IndexDef
		deleteIndex(db, index)
	}

	// Delete all table records
	const tableRecords = db.subspace(["data", table])
	for (const { key } of tableRecords.list()) tableRecords.delete(key)

	// Delete table schema
	db.delete(["model", "table", table])
}

export const hasIndex = (db: ReadOnlyTupleDb, args: { table: string; name: string }) => {
	return db.has(["model", "index", args.table, args.name])
}

export const createIndex = (db: TupleDb, args: IndexDefArgs) => {
	const indexDef: IndexDef = { ...args, fn: args.fn.toString() }
	const error = validate(IndexDefSchema, indexDef)
	if (error) throw new Error(`Invalid index schema: ${formatError(error)}`)

	if (hasIndex(db, indexDef)) throw new Error(`Index ${indexDef.name} already exists`)

	db.set(["model", "index", indexDef.table, indexDef.name], indexDef)
	buildIndex(db, args)
}

const buildIndex = (db: TupleDb, args: IndexDefArgs) => {
	for (const { value } of db.subspace(["data", args.table]).list()) indexRecord(db, args, value)
}

const indexRecord = (db: TupleDb, args: IndexDefArgs, record: any) => {
	const indexKeys = args.fn(record)
	if (!indexKeys) return
	if (Array.isArray(indexKeys)) {
		db.set(["data", [args.table, args.name].join("."), ...indexKeys], null)
		return
	}
	for (const indexKey of indexKeys) {
		db.set(["data", [args.table, args.name].join("."), indexKey], null)
	}
}

export const deleteIndex = (db: TupleDb, args: { table: string; name: string }) => {
	unbuildIndex(db, args)
	db.delete(["model", "index", args.table, args.name])
}

const unbuildIndex = (db: TupleDb, args: { table: string; name: string }) => {
	const index: IndexDef | undefined = db.get(["model", "index", args.table, args.name])
	if (!index) throw new Error(`Index ${args.name} not found`)
	const fn = reifyFn(index.fn) as IndexFn

	for (const { value } of db.subspace(["data", args.table]).list())
		unindexRecord(db, { ...args, fn }, value)
}

const unindexRecord = (db: TupleDb, args: IndexDefArgs, record: any) => {
	const indexKeys = args.fn(record)
	if (!indexKeys) return
	if (Array.isArray(indexKeys)) {
		db.delete(["data", [args.table, args.name].join("."), ...indexKeys])
		return
	}
	for (const indexKey of indexKeys) {
		db.delete(["data", [args.table, args.name].join("."), indexKey])
	}
}

type ValidationMode = "strict" | "optional" | "none"

const validateRecord = (db: TupleDb, record: any, mode: ValidationMode = "strict") => {
	if (!record.table) throw new Error("Record must have a table")
	if (!record.id) throw new Error("Record must have an id")
	if (mode === "none") return

	const schema = db.get(["model", "table", record.table])
	if (schema) {
		const error = validate(schema.dataType, record)
		if (!error) return
		throw new Error(`Invalid ${record.table} record: ${formatError(error)}`)
	}

	if (mode === "strict") {
		throw new Error(`Table schema ${record.table} not found`)
	}
	// console.warn(`Table schema ${record.table} not found`)
}

export const setRecord = (db: TupleDb, record: any, mode: ValidationMode = "strict") => {
	validateRecord(db, record, mode)

	// Overwrite.
	deleteRecord(db, record)
	db.set(["data", record.table, record.id], record)

	// Run the indexers.
	for (const { value } of db.subspace(["model", "index", record.table]).list()) {
		const index: IndexDef = value
		const fn = reifyFn(value.fn) as IndexFn
		indexRecord(db, { ...index, fn }, record)
	}
}

export const deleteRecord = (db: TupleDb, args: { table: string; id: string }) => {
	const existing = db.get(["data", args.table, args.id])
	if (!existing) return

	for (const { value } of db.subspace(["model", "index", args.table]).list()) {
		const index: IndexDef = value
		const fn = reifyFn(value.fn) as IndexFn
		unindexRecord(db, { ...index, fn }, existing)
	}

	db.delete(["data", args.table, args.id])
}

// TODO:
// - id doesnt have to be a string.

export type RecordDb = {
	setTable: (tableDef: TableDef) => void
	deleteTable: (table: string) => void
	hasTable: (table: string) => boolean
	createIndex: (indexDef: IndexDefArgs) => void
	hasIndex: (args: { table: string; name: string }) => boolean
	deleteIndex: (args: { table: string; name: string }) => void
	setRecord: (record: any) => void
	deleteRecord: (args: { table: string; id: string }) => void

	model: ReadOnlyTupleDb
	data: ReadOnlyTupleDb
}

export function recordDb(base: TupleOkv, mode: ValidationMode = "strict"): RecordDb {
	const db = tupleDb(base)
	const recordDb: RecordDb = {
		setTable: (args) => setTable(db, args),
		deleteTable: (args) => deleteTable(db, args),
		hasTable: (args) => hasTable(db, args),
		createIndex: (args) => createIndex(db, args),
		hasIndex: (args) => hasIndex(db, args),
		deleteIndex: (args) => deleteIndex(db, args),
		setRecord: (args) => setRecord(db, args, mode),
		deleteRecord: (args) => deleteRecord(db, args),
		model: readOnlyTupleDb(db.subspace(["model"])),
		data: readOnlyTupleDb(db.subspace(["data"])),
	}
	return recordDb
}

export type RecordDbOperation =
	| { type: "setRecord"; args: { table: string; id: string } }
	| { type: "deleteRecord"; args: { table: string; id: string } }
	| { type: "createIndex"; args: IndexDef }
	| { type: "deleteIndex"; args: { table: string; name: string } }
	| { type: "setTable"; args: TableDef }
	| { type: "deleteTable"; args: string }

export function applyRecordDbOperation(db: RecordDb, op: RecordDbOperation) {
	if (op.type === "createIndex") {
		return db.createIndex({ ...op.args, fn: reifyFn(op.args.fn) })
	} else {
		return db[op.type](op.args)
	}
}
