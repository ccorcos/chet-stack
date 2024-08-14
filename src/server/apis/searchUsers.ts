import * as t from "../../shared/dataTypes"
import { setRecordMap } from "../../shared/recordMapHelpers"
import type { RecordMap } from "../../shared/schema"
import type { ServerEnvironment } from "../services/ServerEnvironment"

export const input = t.object({
	query: t.string,
})

export async function searchUsers(environment: ServerEnvironment, args: t.Infer<typeof input>) {
	const { db } = environment
	const { query } = args

	// TODO: require being logged in for this api?

	const users = query === "" ? [] : await db.searchUsers(query)

	const recordMap: RecordMap = {}
	for (const user of users) {
		setRecordMap(recordMap, { table: "user", id: user.id }, user)
	}
	const userIds = users.map((user) => user.id)

	// By convention, anything in this recordMap gets merges into the RecordCache.
	return { recordMap, userIds }
}

export const handler = searchUsers
