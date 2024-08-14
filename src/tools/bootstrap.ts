/*

npm run bootstrap
./node_modules/.bin/tsx src/tools/bootstrap.ts

*/

import { Database } from "../server/services/Database"
import { config } from "../server/services/ServerConfig"
import { UserRecord } from "../shared/schema"

export async function bootstrap(db: Database) {
	const adminUser: UserRecord = {
		id: config.adminUserId,
		version: 0,
		username: "Admin",
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	}

	await db.write([{ table: "user", id: adminUser.id, record: adminUser }], {})
}

if (require.main === module) {
	const db = new Database(config.dbPath)
	bootstrap(db)
}
