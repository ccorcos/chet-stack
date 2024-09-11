/*

npm run reset
./node_modules/.bin/tsx src/tools/reset.ts

*/

import { Database } from "../server/services/Database"
import { QueueDatabase } from "../server/services/QueueDatabase"
import { config } from "../server/services/ServerConfig"

async function reset() {
	const db = new Database(config.dbPath)
	await db.reset()

	const queue = new QueueDatabase(config.queuePath)
	await queue.reset()
}

if (require.main === module) reset()
