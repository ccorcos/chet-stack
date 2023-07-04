import { RecordMap, RecordPointer, RecordTable, RecordValue } from "../../shared/schema"
import { ServerEnvironment } from "../ServerEnvironment"

/** Either a string containing an error message or `undefined` on success */
export type PermissionResult = string | undefined

export type PermissionContext = {
	userId: string
}

export type PermissionArgs<Table extends RecordTable> = {
	pointer: RecordPointer<Table>
	recordMapBeforeChanges: RecordMap
	recordMapAfterChanges: RecordMap
	context: PermissionContext
}

export type PermissionFn<Table extends RecordTable> = (
	args: PermissionArgs<Table>
) => PermissionResult

export type RecordPermissions<Table extends RecordTable> = {
	fetchPointerAndPermissionRecords: FetchPointerAndPermissionRecordsFn<Table>
	permissionsFn: PermissionFn<Table>
}

export type FetchPointerAndPermissionRecordsArgs<Table extends RecordTable> = PermissionContext & {
	pointer: RecordPointer<Table>
	environment: ServerEnvironment
}

export type FetchPointerAndPermissionRecordsFn<Table extends RecordTable> = (
	args: FetchPointerAndPermissionRecordsArgs<Table>
) => Promise<RecordMap>

export function and<Table extends RecordTable>(
	permissionFns: PermissionFn<Table>[]
): PermissionFn<Table> {
	return (args) =>
		permissionFns.reduce((prev, next) => {
			if (typeof prev === "string") return prev
			return next(args)
		}, undefined as PermissionResult)
}

export function or<Table extends RecordTable>(
	permissionFns: PermissionFn<Table>[]
): PermissionFn<Table> {
	return (args) =>
		permissionFns.reduce((prev, next) => {
			if (typeof prev === "undefined") return prev
			return next(args)
		}, `init` as PermissionResult)
}
