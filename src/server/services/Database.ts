import sqlite from "better-sqlite3"
import { SQLiteOKV } from "tupledb/SQLiteOKV"
import { JSONValue, SyncOKV, Tuple } from "tupledb/types"

export class Database extends SQLiteOKV {
	constructor(public dbPath: string) {
		super(sqlite(dbPath))
	}
	reset() {
		this.write({ delete: this.list().map((row) => row.key) })
	}
}

export type DatabaseApi = SyncOKV<Tuple, JSONValue>
