import { getMessagesApi } from "./apis/getMessages"
import { getThreadsApi } from "./apis/getThreads"
import { writeApi } from "./apis/write"
import { ServerEnvironment } from "./ServerEnvironment"

export type ApiEndpoint = {
	// string implies an error message about what went wrong.
	validate: (body: unknown) => string | undefined
	action: (environment: ServerEnvironment, args: any) => Promise<any>
}

export const api = {
	getMessages: getMessagesApi,
	getThreads: getThreadsApi,
	write: writeApi,
}
