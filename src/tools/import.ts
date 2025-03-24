// ./node_modules/.bin/tsx src/tools/import.ts

import { parse } from "csv-parse/sync"
import { readFileSync } from "fs"
import { Database } from "../server/services/Database"
import { config } from "../server/services/ServerConfig"
import { KeyEncode, PrefixKeyEncoder } from "../shared/database/Encoder"

const db = new Database(config.dbPath)

// db.set("hello", "world")
// db.set("a", "1")

// sqlite3 db/database.sqlite
// sqlite> select * from data;

const plants = KeyEncode(db, PrefixKeyEncoder("plants"))

const csvContent = readFileSync("/Users/chet/Desktop/Stock Files/plants.csv", "utf8")
const records = parse(csvContent, {
	columns: true,
	skip_empty_lines: true,
})

console.log(records)

for (const record of records) {
	const key = record["﻿Common Name"]
	console.log(key)
	const value = JSON.stringify(record)
	plants.set(key, value)
}

// console.log(`Imported ${records.length} plants`)
