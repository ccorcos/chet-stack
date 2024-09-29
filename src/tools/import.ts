// ./node_modules/.bin/tsx src/tools/import.ts

import { Database } from "../server/services/Database"
import { config } from "../server/services/ServerConfig"

const db = new Database(config.dbPath)

db.set("hello", "world")
db.set("a", "1")

// sqlite3 db/database.sqlite
// sqlite> select * from data;
