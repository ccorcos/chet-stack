import sqlite from "better-sqlite3"
import { SQLiteOkv } from "tupledb/SQLiteOkv"

export class Database extends SQLiteOkv {
	constructor(public dbPath: string) {
		super(sqlite(dbPath))
	}
	reset() {
		this.write({ delete: this.list().map((row) => row.key) })
	}
}
