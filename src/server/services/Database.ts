import sqlite from "better-sqlite3"
import { SQLiteDatabase } from "../../shared/database/SQLiteDatabase"
import { OrderedKeyValueApi } from "../../shared/database/types"

export class Database extends SQLiteDatabase {
	constructor(public dbPath: string) {
		super(sqlite(dbPath))
	}

	reset() {}
}

export type DatabaseApi = OrderedKeyValueApi<string, string>
