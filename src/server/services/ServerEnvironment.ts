import { TupleDb } from "tupledb/types"
import type { QueueDatabaseApi } from "./QueueDatabase"
import type { ServerConfig } from "./ServerConfig"
import type { PubsubApi } from "./WebsocketPubsubServer"

export type ServerEnvironment = {
	config: ServerConfig
	db: TupleDb
	pubsub: PubsubApi
	queue: QueueDatabaseApi
}
