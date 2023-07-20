import type { Request, Response } from "express"
import { getMessagesApi } from "./apis/getMessages"
import { getRecordsApi } from "./apis/getRecords"
// import { getThreadsApi } from "./apis/getThreads"
import { loginApi } from "./apis/login"
import { searchUsersApi } from "./apis/searchUsers"
import { writeApi } from "./apis/write"
import { ServerEnvironment } from "./ServerEnvironment"

export type ApiEndpoint = {
	// string implies an error message about what went wrong.
	validate: (body: unknown) => string | undefined
	action: (environment: ServerEnvironment, args: any, req: Request, res: Response) => Promise<any>
}

export const api = {
	getMessages: getMessagesApi,
	// getThreads: getThreadsApi,
	write: writeApi,
	login: loginApi,
	getRecords: getRecordsApi,
	searchUsers: searchUsersApi,
}
