import * as t from "data-type-ts"
import type { RecordPointer, RecordTable } from "../../shared/schema"
import type { ApiEndpoint } from "../api"
import type { ServerEnvironment } from "../ServerEnvironment"

export const input = t.obj({ pointers: t.array(t.obj({ table: t.string, id: t.string })) })

export async function getRecords<T extends RecordTable>(
	environment: ServerEnvironment,
	args: { pointers: RecordPointer<T>[] }
) {
	const { db } = environment
	const recordMap = await db.getRecords(args.pointers)
	// TODO: permissions
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
