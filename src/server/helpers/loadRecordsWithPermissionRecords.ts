import { flatten } from "lodash"
import { assignRecordMap, getRecordMap, iterateRecordMap } from "../../shared/recordMapHelpers"
import { RecordMap, RecordPointer, RecordTable, RecordValue } from "../../shared/schema"
import { DatabaseApi } from "../services/Database"

/** Fetch records along with any other records that are necessary for computing permissions. */
export async function loadRecordsWithPermissionRecords(
	environment: { db: DatabaseApi },
	pointers: RecordPointer[]
) {
	const { db } = environment
	const recordMap = await db.getRecords(pointers)

	const permissionRecords = getPermissionRecordsToFetch(recordMap)
	if (permissionRecords.length > 0) {
		const permissionRecordMap = await db.getRecords(pointers)
		assignRecordMap(recordMap, permissionRecordMap)
	}

	return recordMap
}

const gePermissionRecordsMap: { [T in RecordTable]: (record: RecordValue<T>) => RecordPointer[] } =
	{
		user: () => [],
		user_settings: () => [],
		thread: () => [],
		message: (message) => [{ table: "thread", id: message.thread_id }],
		password: () => [],
		auth_token: () => [],
		file: (file) => {
			if (!file.parent_table || !file.parent_id) return []
			else return [{ table: file.parent_table, id: file.parent_id }]
		},
	}

function getPermissionRecordsToFetch(recordMap: RecordMap) {
	const records = Array.from(iterateRecordMap(recordMap))

	const permissionRecordsToFetch = flatten(
		records.map(({ table, record }) => {
			const getPermissionRecords = gePermissionRecordsMap[table]
			// @ts-ignore
			return getPermissionRecords(record)
		})
	).filter((pointer) => !getRecordMap(recordMap, pointer))

	return permissionRecordsToFetch
}
