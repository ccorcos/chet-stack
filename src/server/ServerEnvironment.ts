import type { EnqueueApi } from "queue/enqueue"
import type { TupleDb } from "tupledb/types"
import type { ServerConfig } from "./services/ServerConfig"
import type { TasksType } from "./tasks"

export type PubsubApi = {
	publish(items: { key: string; value: any }[]): Promise<void>
}

export type ServerEnvironment = {
	config: ServerConfig
	db: TupleDb
	pubsub: PubsubApi
	enqueue: EnqueueApi<TasksType>
}
