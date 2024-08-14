import { Request } from "express"
import * as t from "../../shared/dataTypes"
import { PermissionError } from "../../shared/errors"
import { getCurrentUserId } from "../helpers/getCurrentUserId"
import { loadRecordsWithPermissionRecords } from "../helpers/loadRecordsWithPermissionRecords"
import { filterRecordMapForPermission } from "../helpers/validateRead"
import type { ServerEnvironment } from "../services/ServerEnvironment"

export const input = t.object({
	limit: t.number,
})

export async function getThreads(
	environment: ServerEnvironment,
	args: t.Infer<typeof input>,
	userId: string
) {
	const { db } = environment
	const { limit } = args

	const threadIds = await db.getThreadIds(userId, limit)
	const recordMap = await loadRecordsWithPermissionRecords(
		environment,
		threadIds.map((id) => ({ table: "thread", id }))
	)
	filterRecordMapForPermission(recordMap, userId)

	return { recordMap, threadIds }
}

export async function handler(
	environment: ServerEnvironment,
	args: t.Infer<typeof input>,
	req: Request
) {
	const userId = await getCurrentUserId(environment, req)
	if (!userId) throw new PermissionError("You need to be logged in.")
	return getThreads(environment, args, userId)
}
