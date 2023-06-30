import * as t from "data-type-ts"
import { RecordMapHelpers } from "../../shared/recordMapHelpers"
import type { RecordMap } from "../../shared/schema"
import type { ApiEndpoint } from "../api"
import type { ServerEnvironment } from "../ServerEnvironment"

// Schema for validating input.
export const input = t.obj({ query: t.string })

// The actual api method.
export async function searchUsers(environment: ServerEnvironment, args: typeof input.value) {
	const { db } = environment
	const { query } = args

	const users = query === "" ? [] : await db.searchUsers(query)

	const recordMap: RecordMap = {}
	for (const user of users) {
		RecordMapHelpers.setRecord(recordMap, { table: "user", id: user.id }, user)
	}
	const userIds = users.map((user) => user.id)

	// By convention, anything in this recordMap gets merges into the RecordCache.
	return { recordMap, userIds }
}

// This type is used for typescript-friendly calls to the api from the app.
export type searchUsersApiType = {
	input: typeof input.value
	output: ReturnType<typeof searchUsers>
}

// This is used for registering this api on the server.
export const searchUsersApi: ApiEndpoint = {
	validate: (body) => {
		const error = input.validate(body)
		if (error) return t.formatError(error)
	},
	action: searchUsers,
}
