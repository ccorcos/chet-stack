import { RecordMap, RecordPointer, RecordTable } from "../../shared/schema"
import { PermissionFn } from "./shared"

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
