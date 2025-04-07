import type { DatabaseApi, RawDatabaseApi } from "./Database"
import type { QueueDatabaseApi } from "./QueueDatabase"
import type { ServerConfig } from "./ServerConfig"
import type { PubsubApi } from "./WebsocketPubsubServer"

export type ServerEnvironment = {
	config: ServerConfig
	rawDb: RawDatabaseApi
	db: DatabaseApi
	pubsub: PubsubApi
	queue: QueueDatabaseApi
}
