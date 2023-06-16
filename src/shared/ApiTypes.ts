// This file only imports types from the server and is used to create a typescript-friendly
// interface for interacting with the API from the app.

// import type { getMessagesApiType } from "../server/apis/getMessages"
import { getRecordsApiType } from "../server/apis/getRecords"
// import type { getThreadsApiType } from "../server/apis/getThreads"
import type { loginApiType } from "../server/apis/login"
import type { writeApiType } from "../server/apis/write"

export type ApiTypes = {
	// getMessages: getMessagesApiType
	// getThreads: getThreadsApiType
	write: writeApiType
	login: loginApiType
	getRecords: getRecordsApiType
}
