/*

./node_modules/.bin/tsx src/server/migrations/migrate.ts

*/

import { Database } from "../services/Database"
import { config } from "../services/ServerConfig"

const db = new Database(config.dbPath)

function clear() {
	console.log("Clearing...")
	while (true) {
		const list = db.list({ limit: 300 })
		if (list.length === 0) break
		db.write({ delete: list.map(({ key }) => key) })
	}
	console.log("Cleared")
}

clear()
// importAppleContacts(db)
// indexVCards(db)

console.log("Writing numbers...")
for (let i = 0; i < 100000; i += 10000) {
	const batch: { key: string; value: string }[] = []
	for (let j = 0; j < 10000 && i + j < 100000; j++) {
		const num = i + j
		// Pad number with zeros to ensure lexicographic ordering
		const key = `num:${num.toString().padStart(12, "0")}`
		batch.push({ key, value: num.toString() })
	}

	db.write({ set: batch })
	console.log(`Wrote ${i + batch.length} numbers...`)
}
console.log("Done writing numbers")
