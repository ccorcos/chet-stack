/*

npm run reset
./node_modules/.bin/tsx src/tools/reset.ts

*/

import { Database } from "database/Database"
import { QueueDatabase } from "queue/QueueDatabase"
import { config } from "server/services/ServerConfig"

async function reset() {
	const db = new Database(config.dbPath)
	await db.reset()

	const queue = new QueueDatabase(config.queuePath)
	await queue.reset()
}

if (import.meta.url === `file://${process.argv[1]}`) await reset()
