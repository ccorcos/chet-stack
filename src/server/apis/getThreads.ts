// import * as t from "data-type-ts"
// import { setRecordMap } from "../../shared/recordMapHelpers"
// import type { RecordMap } from "../../shared/schema"
// import type { ApiEndpoint } from "../api"
// import type { ServerEnvironment } from "../ServerEnvironment"

// export const input = t.obj({})

// export async function getThreads(
// 	environment: ServerEnvironment,
// 	args: typeof input.value
// ) {
// 	const { db } = environment

// 	const threads = await db.getThreads()

// 	const recordMap: RecordMap = {}
// 	for (const thread of threads) {
// 		setRecordMap(recordMap, { table: "thread", id: thread.id }, thread)
// 	}
// 	const threadIds = threads.map((thread) => thread.id)

// 	return { recordMap, threadIds }
// }

// export type getThreadsApiType = {
// 	input: typeof input.value
// 	output: ReturnType<typeof getThreads>
// }

// export const getThreadsApi: ApiEndpoint = {
// 	validate: (body) => {
// 		const error = input.validate(body)
// 		if (error) return t.formatError(error)
// 	},
// 	action: getThreads,
// }
