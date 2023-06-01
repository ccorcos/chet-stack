import { DatabaseApi } from "./database"

export type ServerEnvironment = {
	db: DatabaseApi
	// pubsub: PubSub
}
