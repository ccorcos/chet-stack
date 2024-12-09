/*

./node_modules/.bin/tsx src/server/migrations/migrate.ts

*/

import { Database } from "../services/Database"
import { config } from "../services/ServerConfig"

const db = new Database(config.dbPath)

for (let i = 0; i < 1000; i++) {
	db.write({
		set: [{ key: i.toString().padStart(8, "0"), value: `${Math.log10(i)}` }],
	})
}
