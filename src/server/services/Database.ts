import sqlite from "better-sqlite3"
import { SQLiteDatabase } from "../../shared/database/SQLiteDatabase"
import { BaseOKV } from "../../shared/database/types"

export class Database extends SQLiteDatabase {
	constructor(public dbPath: string) {
		super(sqlite(dbPath))
	}

	reset() {}
}

export type DatabaseApi = BaseOKV<string, string>
