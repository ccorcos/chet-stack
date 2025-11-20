import type { TupleDb } from "tupledb/types"
import type { PubsubApi } from "./services/Pubsub"
import type { QueueDatabaseApi } from "./services/QueueDatabase"
import type { ServerConfig } from "./services/ServerConfig"

export type ServerEnvironment = {
	config: ServerConfig
	db: TupleDb
	pubsub: PubsubApi
	queue: QueueDatabaseApi
}
