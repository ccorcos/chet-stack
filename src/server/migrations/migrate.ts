/*

./node_modules/.bin/tsx src/server/migrations/migrate.ts

*/

import { Database } from "../services/Database"
import { config } from "../services/ServerConfig"
import { importAppleContacts, indexVCards } from "./importAppleContacts"

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
importAppleContacts(db)
indexVCards(db)
