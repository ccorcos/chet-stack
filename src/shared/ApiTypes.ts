// This file only imports types from the server and is used to create a typescript-friendly
// interface for interacting with the API from the app.

import type { getMessagesApiType } from "../tools/apis/getMessages"
import type { getThreadsApiType } from "../tools/apis/getThreads"

export type ApiTypes = {
	getMessages: getMessagesApiType
	getThreads: getThreadsApiType
}
