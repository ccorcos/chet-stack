import type { DatabaseApi } from "./Database"
import type { QueueDatabaseApi } from "./QueueDatabase"
import type { ServerConfig } from "./ServerConfig"
import type { PubsubApi } from "./WebsocketPubsubServer"

export type ServerEnvironment = {
	config: ServerConfig
	db: DatabaseApi
	pubsub: PubsubApi
	queue: QueueDatabaseApi
}
