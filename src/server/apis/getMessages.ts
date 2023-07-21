import * as t from "data-type-ts"
import { Request } from "express"
import { PermissionError } from "../../shared/errors"
import type { ServerEnvironment } from "../ServerEnvironment"
import type { ApiEndpoint } from "../api"
import { getCurrentUserId } from "../getCurrentUser"
import { loadRecordsWithAncestors } from "../loadRecordsWithAncestors"
import { filterRecordMapForPermission } from "../validateRead"

// Schema for validating input.
export const input = t.obj({ threadId: t.string, limit: t.or(t.number, t.undefined_) })

// The actual api method.
export async function getMessages(
	environment: ServerEnvironment,
	args: typeof input.value,
	req: Request
) {
	const { db } = environment
	const { threadId, limit } = args

	const userId = await getCurrentUserId(environment, req)
	if (!userId) throw new PermissionError("You need to be logged in.")

	const messageIds = await db.getMessageIds(threadId, (limit || 10) + 1)
	const recordMap = await loadRecordsWithAncestors(
		environment,
		messageIds.map((id) => ({ table: "message", id }))
	)
	filterRecordMapForPermission(recordMap, userId)

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
