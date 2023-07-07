import { getRecordMap } from "../shared/recordMapHelpers"
import { RecordMap, RecordPointer, RecordTable } from "../shared/schema"

export function validateRead(args: {
	pointer: RecordPointer
	recordMap: RecordMap
	userId: string
}) {
	const { pointer, recordMap, userId } = args
	const validateRecordRead = validateReadMap[pointer.table]
	// @ts-ignore
	return validateRecordRead({ pointer, recordMap, userId })
}

export function canRead(args: { pointer: RecordPointer; recordMap: RecordMap; userId: string }) {
	const error = validateRead(args)
	return !error
}

const validateReadMap: {
	[T in RecordTable]: (args: {
		pointer: RecordPointer<T>
		recordMap: RecordMap
		userId: string
	}) => string | undefined
} = {
	user: validateReadUser,
	user_settings: validateReadUserSettings,
	thread: validateReadThread,
	message: validateReadMessage,
	password: () => "Users cannot read to this table.",
	auth_token: () => "Users cannot read to this table.",
}

function validateReadMessage(args: {
	pointer: RecordPointer<"message">
	recordMap: RecordMap
	userId: string | undefined
}) {
	const { pointer, recordMap, userId } = args
	if (!userId) return "You must be logged in to read a message."

	const message = getRecordMap(recordMap, pointer)
	// User's can read records that don't exist, same as they can write to records that don't exist yet.
	if (!message) return

	return validateReadThread({
		pointer: { table: "thread", id: message.thread_id },
		recordMap,
		userId,
	})
}

function validateReadThread(args: {
	pointer: RecordPointer<"thread">
	recordMap: RecordMap
	userId: string | undefined
}) {
	const { pointer, recordMap, userId } = args
	if (!userId) return "You must be logged in to read a thread."

	const thread = getRecordMap(recordMap, pointer)
	if (!thread) return

	if (thread.created_by !== userId && !thread.member_ids.includes(userId))
		return "You cannot read a thread you did not create and are not a member of."
}

function validateReadUser(args: {
	pointer: RecordPointer<"user">
	recordMap: RecordMap
	userId: string | undefined
}) {
	const { userId } = args
	if (!userId) return "You must be logged in to read a user record."
}

function validateReadUserSettings(args: {
	pointer: RecordPointer<"user_settings">
	recordMap: RecordMap
	userId: string | undefined
}) {
	const { pointer, recordMap, userId } = args
	if (!userId) return "You must be logged in to read a user record."

	const userSettings = getRecordMap(recordMap, pointer)
	if (!userSettings) return

	if (userId !== userSettings.id) return "You can only read your own user settings record."
}
