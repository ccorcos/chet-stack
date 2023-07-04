import { iterateRecordMap, setRecordMap } from "../../shared/recordMapHelpers"
import { RecordMap, RecordPointer, RecordTable } from "../../shared/schema"
import { ServerEnvironment } from "../ServerEnvironment"
import { messagePermissions } from "./message"
import { FetchPointerAndPermissionRecordsFn, PermissionFn, RecordPermissions } from "./shared"

export function getPermissionsErrors(args: {
	pointers: RecordPointer[]
	recordMapBeforeChanges: RecordMap
	recordMapAfterChanges: RecordMap
	userId: string
}) {
	const { pointers, recordMapBeforeChanges, recordMapAfterChanges, userId } = args

	const permissionResults = pointers.map((pointer) => {
		const permissionFn = permissionsMap[pointer.table]?.permissionsFn as
			| PermissionFn<RecordTable>
			| undefined

		// If we can't find permissions for a pointer we default to "not allowed"
		if (!permissionFn) {
			return `${pointer.table} records not permitted`
		}

		return permissionFn({
			pointer,
			recordMapBeforeChanges,
			recordMapAfterChanges,
			context: { userId },
		})
	})

	return permissionResults.filter((r): r is string => typeof r === "string")
}

// TODO: fetch all data used by permissions in a transaction
export async function fetchPointerAndPermissionRecords(args: {
	pointers: RecordPointer[]
	userId: string
	environment: ServerEnvironment
}) {
	const { pointers, userId, environment } = args

	const recordMaps = await Promise.all(
		pointers.map(async (pointer) => {
			const fetchFn = permissionsMap[pointer.table]?.fetchPointerAndPermissionRecords as
				| FetchPointerAndPermissionRecordsFn<RecordTable>
				| undefined

			if (!fetchFn) {
				throw new Error("todo: handle this")
			}

			return fetchFn({ pointer, userId, environment })
		})
	)

	const combinedRecordMap = {} as RecordMap

	for (const recordMap of recordMaps) {
		for (const recordWithTable of iterateRecordMap(recordMap)) {
			setRecordMap(combinedRecordMap, recordWithTable, recordWithTable.record)
		}
	}

	return combinedRecordMap
}

const PLACEHOLDER_PERMISSIONS: RecordPermissions<RecordTable> = {
	fetchPointerAndPermissionRecords: async ({ pointer, environment }) => {
		const recordMap = {} as RecordMap
		const record = await environment.db.getRecord(pointer)
		if (record) {
			setRecordMap(recordMap, pointer, record)
		}
		return recordMap
	},
	permissionsFn: () => undefined,
}

const permissionsMap: {
	[Table in RecordTable]: RecordPermissions<Table>
} = {
	user: PLACEHOLDER_PERMISSIONS,
	user_settings: PLACEHOLDER_PERMISSIONS,
	auth_token: PLACEHOLDER_PERMISSIONS,
	password: PLACEHOLDER_PERMISSIONS,
	thread: PLACEHOLDER_PERMISSIONS,
	message: messagePermissions,
}
