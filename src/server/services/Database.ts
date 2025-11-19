import sqlite from "better-sqlite3"
import { SQLiteOkv } from "tupledb/SQLiteOkv"
import { JSONValue, Okv, Tuple } from "tupledb/types"

export class Database extends SQLiteOkv {
	constructor(public dbPath: string) {
		super(sqlite(dbPath))
	}
	reset() {
		this.write({ delete: this.list().map((row) => row.key) })
	}
}

export type DatabaseApi = Okv<Tuple, JSONValue>
