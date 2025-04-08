import sqlite from "better-sqlite3"
import { SQLiteDatabase } from "../../shared/database/SQLiteDatabase"
import { BaseOKV } from "../../shared/database/types"

export class Database extends SQLiteDatabase {
	constructor(public dbPath: string) {
		super(sqlite(dbPath))
	}
	reset() {
		this.write({ delete: this.list().map((row) => row.key) })
	}
}

export type RawDatabaseApi = BaseOKV<string, string>

export type DatabaseApi = BaseOKV<any[], any>
