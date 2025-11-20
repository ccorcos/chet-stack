import { TupleDb } from "tupledb/types"
import type { QueueDatabaseApi } from "./services/QueueDatabase"
import type { ServerConfig } from "./services/ServerConfig"
import type { PubsubApi } from "./services/WebsocketPubsubServer"

export type ServerEnvironment = {
	config: ServerConfig
	db: TupleDb
	pubsub: PubsubApi
	queue: QueueDatabaseApi
}
