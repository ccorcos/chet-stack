import { DatabaseApi } from "./database"
import { PubSubApi } from "./pubsub"

export type ServerEnvironment = {
	db: DatabaseApi
	pubsub: PubSubApi
}
