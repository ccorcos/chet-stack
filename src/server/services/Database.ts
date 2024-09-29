import sqlite from "better-sqlite3"
import { SQLiteDatabase } from "../../shared/database/SQLiteDatabase"
import { Simplify } from "../../shared/typeHelpers"
import { path } from "../helpers/path"

export class Database extends SQLiteDatabase {
	constructor(public dbPath: string) {
		super(sqlite(path(dbPath)))
	}

	reset() {}
}

export type DatabaseApi = Simplify<Database>
