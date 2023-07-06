import { flatten } from "lodash"
import { assignRecordMap, getRecordMap, iterateRecordMap } from "../shared/recordMapHelpers"
import { RecordMap, RecordPointer, RecordTable, RecordValue } from "../shared/schema"
import { DatabaseApi } from "./database"

/** Fetch records along with any ancestor records that are necessary for computing permissions. */
export async function loadRecordsWithAncestors(
	environment: { db: DatabaseApi },
	pointers: RecordPointer[]
) {
	const { db } = environment
	const recordMap = await db.getRecords(pointers)

	const ancestors = getRecordMapAncestorsToFetch(recordMap)
	if (ancestors.length > 0) {
		const ancestorsRecordMap = await db.getRecords(pointers)
		assignRecordMap(recordMap, ancestorsRecordMap)
	}

	return recordMap
}

const getRecordAncestorsMap: { [T in RecordTable]: (record: RecordValue<T>) => RecordPointer[] } = {
	user: () => [],
	user_settings: () => [],
	thread: () => [],
	message: (message) => [{ table: "thread", id: message.thread_id }],
	password: () => [],
	auth_token: () => [],
}

function getRecordMapAncestorsToFetch(recordMap: RecordMap) {
	const records = Array.from(iterateRecordMap(recordMap))

	const ancestorsToFetch = flatten(
		records.map(({ table, record }) => {
			const getRecordAncestors = getRecordAncestorsMap[table]
			// @ts-ignore
			return getRecordAncestors(record)
		})
	).filter((pointer) => !getRecordMap(recordMap, pointer))

	return ancestorsToFetch
}
