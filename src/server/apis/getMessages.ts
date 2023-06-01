import * as t from "data-type-ts"
import { setRecordMap } from "../../shared/recordMapHelpers"
import type { RecordMap } from "../../shared/schema"
import type { ApiEndpoint } from "../api"
import type { ServerEnvironment } from "../ServerEnvironment"

// Schema for validating input.
export const input = t.obj({ threadId: t.string })

// The actual api method.
export async function getMessages(
	environment: ServerEnvironment,
	args: typeof input.value
) {
	const { db } = environment
	const { threadId } = args

	const messages = await db.getMessages(threadId)

	const recordMap: RecordMap = {}
	for (const message of messages) {
		setRecordMap(recordMap, { table: "message", id: message.id }, message)
	}
	const messageIds = messages.map((message) => message.id)

	// By convention, anything in this recordMap gets merges into the RecordCache.
	return { recordMap, messageIds }
}

// This type is used for typescript-friendly calls to the api from the app.
export type getMessagesApiType = {
	input: typeof input.value
	output: ReturnType<typeof getMessages>
}

// This is used for registering this api on the server.
export const getMessagesApi: ApiEndpoint = {
	validate: (body) => {
		const error = input.validate(body)
		if (error) return t.formatError(error)
	},
	action: getMessages,
}
