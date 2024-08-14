import * as t from "data-type-ts"
import { Request } from "express"
import { PermissionError } from "../../shared/errors"
import { getCurrentUserId } from "../helpers/getCurrentUserId"
import { loadRecordsWithPermissionRecords } from "../helpers/loadRecordsWithPermissionRecords"
import { filterRecordMapForPermission } from "../helpers/validateRead"
import type { ServerEnvironment } from "../services/ServerEnvironment"

export const input = t.object({
	threadId: t.string,
	limit: t.number,
})

export async function getMessages(
	environment: ServerEnvironment,
	args: t.Infer<typeof input>,
	userId: string
) {
	const { db } = environment
	const { threadId, limit } = args

	const messageIds = await db.getMessageIds(threadId, limit)
	const recordMap = await loadRecordsWithPermissionRecords(
		environment,
		messageIds.map((id) => ({ table: "message", id }))
	)
	filterRecordMapForPermission(recordMap, userId)

	return { recordMap, messageIds }
}

export async function handler(
	environment: ServerEnvironment,
	args: t.Infer<typeof input>,
	req: Request
) {
	const userId = await getCurrentUserId(environment, req)
	if (!userId) throw new PermissionError("You need to be logged in.")
	return getMessages(environment, args, userId)
}
