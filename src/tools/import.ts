// ./node_modules/.bin/tsx src/tools/import.ts

import { parse } from "csv-parse/sync"
import { Database } from "database/Database"
import { readFileSync } from "node:fs"
import { config } from "server/services/ServerConfig"
import { tupleDb, tupleOkv } from "tupledb/TupleDb"

const db = new Database(config.dbPath)

// db.set("hello", "world")
// db.set("a", "1")

// sqlite3 db/database.sqlite
// sqlite> select * from data;

const plants = tupleDb(tupleOkv(db)).subspace(["plants"])

const csvContent = readFileSync("/Users/chet/Desktop/Stock Files/plants.csv", "utf8")
const records = parse(csvContent, {
	columns: true,
	skip_empty_lines: true,
})

console.log(records)

for (const record of records) {
	const name = (record as Record<string, any>)["﻿Common Name"]
	plants.set([name], record)
}

console.log(`Imported ${records.length} plants`)
