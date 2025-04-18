/*

Adds a record layer on top of TupleDb.

*/

import { DataType, formatError, validate } from "../DataType"
import { reifyFn } from "../reifyFn"
import { transact } from "./TupleDb"

type TableSchema = { table: string; dataType: DataType }

export const createTable = transact((tx, table: string, dataType: DataType) => {
	if (tx.has(["internal", "table", table])) return false

	const tableSchema: TableSchema = { table, dataType }
	tx.set(["internal", "table", table], tableSchema)
	return true
})

export const deleteTable = transact((tx, table: string) => {
	// Delete all table indexes
	for (const { value: index } of tx.subspace(["internal", "index", table]).list()) {
		deleteIndex(tx, index.table, index.name)
	}

	// Delete all table records
	const tableRecords = tx.subspace(["external", table])
	for (const { key } of tableRecords.list()) tableRecords.delete(key)

	// Delete table schema
	tx.delete(["internal", "table", table])
})

type IndexFn = (value: any) => undefined | any[] | Generator<any[]>
type Index = { table: string; name: string; fn: string }

export const createIndex = transact((tx, table: string, name: string, fn: IndexFn) => {
	if (tx.has(["internal", "index", table, name])) return false
	const index: Index = { table, name, fn: fn.toString() }
	tx.set(["internal", "index", table, name], index)
	buildIndex(tx, table, name)
	return true
})

const buildIndex = transact((tx, table: string, name: string) => {
	const index = tx.get(["internal", "index", table, name])
	if (!index) throw new Error(`Index ${name} not found`)
	const fn = reifyFn(index.fn) as IndexFn

	for (const { value } of tx.subspace(["external", table]).list())
		indexRecord(tx, table, name, fn, value)
})

const indexRecord = transact((tx, table: string, name: string, fn: IndexFn, value: any) => {
	const indexKeys = fn(value)
	if (!indexKeys) return
	if (Array.isArray(indexKeys)) {
		tx.set(["external", [table, name].join("."), ...indexKeys], null)
		return
	}
	for (const indexKey of indexKeys) {
		tx.set(["external", [table, name].join("."), indexKey], null)
	}
})

export const deleteIndex = transact((tx, table: string, name: string) => {
	unbuildIndex(tx, table, name)
	tx.delete(["internal", "index", table, name])
})

const unbuildIndex = transact((tx, table: string, name: string) => {
	const index = tx.get(["internal", "index", table, name])
	if (!index) throw new Error(`Index ${name} not found`)
	const fn = reifyFn(index.fn) as IndexFn

	for (const { value } of tx.subspace(["external", table]).list())
		unindexRecord(tx, table, name, fn, value)
})

const unindexRecord = transact((tx, table: string, name: string, fn: IndexFn, value: any) => {
	const indexKeys = fn(value)
	if (!indexKeys) return
	if (Array.isArray(indexKeys)) {
		tx.delete(["external", [table, name].join("."), ...indexKeys])
		return
	}
	for (const indexKey of indexKeys) {
		tx.delete(["external", [table, name].join("."), indexKey])
	}
})

const validateRecord = transact((tx, table: string, record: any) => {
	const schema = tx.get(["internal", "table", table])
	if (!schema) {
		throw new Error(`Table schema ${table} not found`)
	} else {
		const error = validate(schema.dataType, record)
		if (error) throw new Error(`Invalid ${table} record: ${formatError(error)}`)
	}
})

export const setRecord = transact((tx, table: string, record: any) => {
	validateRecord(tx, table, record)
	deleteRecord(tx, table, record.id)

	tx.set(["external", table, record.id], record)

	// Run the indexers.
	for (const { value } of tx.subspace(["internal", "index", table]).list()) {
		const { name } = value
		const fn = reifyFn(value.fn) as IndexFn
		indexRecord(tx, table, name, fn, record)
	}
})

export const deleteRecord = transact((tx, table: string, id: string) => {
	const existing = tx.get(["external", table, id])
	if (!existing) return

	for (const { value } of tx.subspace(["internal", "index", table]).list()) {
		const { name } = value
		const fn = reifyFn(value.fn) as IndexFn
		unindexRecord(tx, table, name, fn, existing)
	}

	tx.delete(["external", table, id])
})
