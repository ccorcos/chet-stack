import * as t from "data-type-ts"
import type { Request } from "express"
import type { RecordPointer } from "../../shared/schema"
import type { ServerEnvironment } from "../ServerEnvironment"
import type { ApiEndpoint } from "../api"
import { getCurrentUserId } from "../getCurrentUser"
import { loadRecordsWithAncestors } from "../loadRecordsWithAncestors"
import { filterRecordMapForPermission } from "../validateRead"

export const input = t.obj({ pointers: t.array(t.obj({ table: t.string, id: t.string })) })

export async function getRecords(
	environment: ServerEnvironment,
	args: { pointers: RecordPointer[] },
	req: Request
) {
	const userId = await getCurrentUserId(environment, req)
	const recordMap = await loadRecordsWithAncestors(environment, args.pointers)
	filterRecordMapForPermission(recordMap, userId)
	return { recordMap }
}

export type getRecordsApiType = {
	input: typeof input.value
	output: ReturnType<typeof getRecords>
}

export const getRecordsApi: ApiEndpoint = {
	validate: (body) => {
		const error = input.validate(body)
		if (error) return t.formatError(error)
	},
	action: getRecords,
}
