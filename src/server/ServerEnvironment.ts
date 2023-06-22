import { DatabaseApi } from "./database"
import { PubSubApi } from "./pubsub"
import { ServerConfig } from "./ServerConfig"

export type ServerEnvironment = {
	config: ServerConfig
	db: DatabaseApi
	pubsub: PubSubApi
}
