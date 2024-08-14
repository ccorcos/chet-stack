import type { Request } from "express"
import * as t from "../../shared/dataTypes"
import type { RecordPointer } from "../../shared/schema"
import { getCurrentUserId } from "../helpers/getCurrentUserId"
import { loadRecordsWithPermissionRecords } from "../helpers/loadRecordsWithPermissionRecords"
import { filterRecordMapForPermission } from "../helpers/validateRead"
import type { ServerEnvironment } from "../services/ServerEnvironment"

export const input = t.object({
	pointers: t.array(
		t.object({
			table: t.string,
			id: t.uuid,
		})
	),
})

export async function getRecords(
	environment: ServerEnvironment,
	args: { pointers: RecordPointer[] },
	userId: string | undefined
) {
	const recordMap = await loadRecordsWithPermissionRecords(environment, args.pointers)
	filterRecordMapForPermission(recordMap, userId)
	return { recordMap }
}

export async function handler(
	environment: ServerEnvironment,
	args: { pointers: RecordPointer[] },
	req: Request
) {
	const userId = await getCurrentUserId(environment, req)
	return getRecords(environment, args, userId)
}
