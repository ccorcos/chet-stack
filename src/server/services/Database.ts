import sqlite from "better-sqlite3"
import { SQLiteBaseOKV } from "../../shared/database/SQLiteBaseOKV"
import { BaseOKV, JSONValue, Tuple } from "../../shared/database/types"

export class Database extends SQLiteBaseOKV {
	constructor(public dbPath: string) {
		super(sqlite(dbPath))
	}
	reset() {
		this.write({ delete: this.list().map((row) => row.key) })
	}
}

export type DatabaseApi = BaseOKV<Tuple, JSONValue>
