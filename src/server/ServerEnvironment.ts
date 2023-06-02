import { ConfigApi } from "./config"
import { DatabaseApi } from "./database"
import { PubSubApi } from "./pubsub"

export type ServerEnvironment = {
	config: ConfigApi
	db: DatabaseApi
	pubsub: PubSubApi
}
