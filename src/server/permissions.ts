import { compact, omit, uniq } from "lodash"
import { getRecordMap } from "../shared/recordMapHelpers"
import { MessageRecord, RecordMap, RecordPointer, RecordTable } from "../shared/schema"

export function validateWrite(args: {
	pointers: RecordPointer[]
	beforeRecordMap: RecordMap
	afterRecordMap: RecordMap
	userId: string
}) {
	const { pointers, beforeRecordMap, afterRecordMap, userId } = args
	const errors = compact(
		pointers.map((pointer) => {
			const validateRecordWrite = validateWriteMap[pointer.table]
			// @ts-ignore
			return validateRecordWrite({ pointer, beforeRecordMap, afterRecordMap, userId })
		})
	)
	return errors
}

const validateWriteMap: {
	[T in RecordTable]: (args: {
		pointer: RecordPointer<T>
		beforeRecordMap: RecordMap
		afterRecordMap: RecordMap
		userId: string
	}) => string | undefined
} = {
	user: () => undefined,
	user_settings: () => undefined,
	thread: () => undefined,
	message: validateWriteMessage,
	password: () => "Users cannot write to this table.",
	auth_token: () => "Users cannot write to this table.",
}

const allowEditMessageProperties: (keyof MessageRecord)[] = ["version", "updated_at", "text"]

function validateWriteMessage(args: {
	pointer: RecordPointer<"message">
	beforeRecordMap: RecordMap
	afterRecordMap: RecordMap
	userId: string | undefined
}) {
	const { pointer, beforeRecordMap, afterRecordMap, userId } = args
	const before = getRecordMap(beforeRecordMap, pointer)
	const after = getRecordMap(afterRecordMap, pointer)

	if (!before && after) {
		// Created.
		if (after.author_id !== userId) return "You cannot create a message that you did not author."

		const thread = getRecordMap(afterRecordMap, { table: "thread", id: after.thread_id })
		if (!thread) return "Message thread not found."
		if (!thread.member_ids.includes(userId))
			return "You must be a member of this thread to post a message."
	}

	if (before && after) {
		// Updated.
		if (after.author_id !== userId) return "You cannot edit a message you did not author."

		const beforeConst = omit(before, allowEditMessageProperties)
		const afterConst = omit(before, allowEditMessageProperties)
		const keys = uniq([...Object.keys(beforeConst), ...Object.keys(after)])
		for (const key of keys) {
			if (beforeConst[key] !== afterConst[key]) {
				return "Not allowed to edit message." + key
			}
		}
	}

	if (before && !after) {
		// Deleted.
		if (before.author_id !== userId) return "You cannot delete a message you did not author."

		const thread = getRecordMap(afterRecordMap, { table: "thread", id: before.thread_id })
		if (!thread) return "Message thread not found."
		if (!thread.member_ids.includes(userId))
			return "You must be a member of this thread to post a message."
	}
}
