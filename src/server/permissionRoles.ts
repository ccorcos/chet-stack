import { getRecordMap } from "../shared/recordMapHelpers"
import { RecordMap, RecordPointer, RecordTable } from "../shared/schema"

type Role = "reader" | "editor"

export function getRole(args: { pointer: RecordPointer; recordMap: RecordMap; userId: string }) {
	const { pointer, recordMap, userId } = args
	const getRecordRole = getRoleMap[pointer.table]
	// @ts-ignore
	return getRecordRole({ pointer, recordMap, userId })
}

export function canRead(args: { pointer: RecordPointer; recordMap: RecordMap; userId: string }) {
	const role = getRole(args)
	return role === "reader" || role === "editor"
}

export function canEdit(args: { pointer: RecordPointer; recordMap: RecordMap; userId: string }) {
	const role = getRole(args)
	return role === "editor"
}

const getRoleMap: {
	[T in RecordTable]: (args: {
		pointer: RecordPointer<T>
		recordMap: RecordMap
		userId: string
	}) => Role | undefined
} = {
	user: getUserRole,
	user_settings: getUserSettingsRole,
	thread: getThreadRole,
	message: getMessageRole,
	password: () => undefined,
	auth_token: () => undefined,
}

function getThreadRole(args: {
	pointer: RecordPointer<"thread">
	recordMap: RecordMap
	userId: string | undefined
}) {
	const { pointer, recordMap, userId } = args
	if (!userId) return

	const thread = getRecordMap(recordMap, pointer)
	if (!thread) return "editor"

	if (thread.created_by === userId) return "editor"
	if (thread.member_ids.includes(userId)) return "editor"
}

function getMessageRole(args: {
	pointer: RecordPointer<"message">
	recordMap: RecordMap
	userId: string | undefined
}) {
	const { pointer, recordMap, userId } = args
	if (!userId) return

	const message = getRecordMap(recordMap, pointer)
	if (!message) return "editor"

	const role = getThreadRole({
		pointer: { table: "thread", id: message.thread_id },
		recordMap,
		userId,
	})
	if (!role) return

	if (message.author_id === userId) return "editor"
	return "reader"
}

function getUserRole(args: {
	pointer: RecordPointer<"user">
	recordMap: RecordMap
	userId: string | undefined
}) {
	const { pointer, userId } = args
	if (!userId) return

	if (pointer.id === userId) return "editor"
	return "reader"
}

function getUserSettingsRole(args: {
	pointer: RecordPointer<"user_settings">
	recordMap: RecordMap
	userId: string | undefined
}) {
	const { pointer, recordMap, userId } = args
	if (!userId) return

	const userSettings = getRecordMap(recordMap, pointer)
	if (!userSettings) return

	if (userId === userSettings.id) return "editor"
}
