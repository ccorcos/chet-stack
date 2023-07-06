import { getRecordMap } from "../../shared/recordMapHelpers"
import { PermissionArgs, PermissionResult, RecordPermissions, and } from "./shared"

const permissionsFn = and([authorWasNotChanged, userIsAuthor, userHasPermissionToAccessThread])

export const messagePermissions: RecordPermissions<"message"> = {
	fetchPointerAndPermissionRecords,
	permissionsFn,
}

function authorWasNotChanged(args: PermissionArgs<"message">): PermissionResult {
	const previous = getRecordMap(args.recordMapBeforeChanges, args.pointer)
	const next = getRecordMap(args.recordMapAfterChanges, args.pointer)

	if (previous && next) {
		if (previous.author_id !== next.author_id) {
			return `MessageRecord#author_id: message author cannot be changed`
		}
	}
}

function userIsAuthor(args: PermissionArgs<"message">): PermissionResult {
	const previous = getRecordMap(args.recordMapBeforeChanges, args.pointer)
	const next = getRecordMap(args.recordMapAfterChanges, args.pointer)

	if (next) {
		if (next.author_id !== args.context.userId) {
			return `MessageRecord#author_id: you don't have permission to ${
				previous ? "edit" : "create"
			} this message`
		}
	}

	if (previous && !next) {
		if (previous.author_id !== args.context.userId) {
			return `MessageRecord#author_id: you don't have permission to delete this message`
		}
	}
}

function userHasPermissionToAccessThread(args: PermissionArgs<"message">): PermissionResult {
	const previous = getRecordMap(args.recordMapBeforeChanges, args.pointer)
	const next = getRecordMap(args.recordMapAfterChanges, args.pointer)

	if (next) {
		// We get the thread after changes in case the thread is being updated in
		// this transaction. We defer to the permissions
		// for the ThreadRecord to ensure that a thread isn't updated
		// when it shouldn't be.
		const thread = getRecordMap(args.recordMapAfterChanges, {
			table: "thread",
			id: next.thread_id,
		})

		if (!thread) {
			return `MessageRecord#thread_id: thread not found`
		}

		if (!thread.member_ids.includes(args.context.userId)) {
			return `MessageRecord#thread_id: you don't have permission to access this thread`
		}
	}

	if (previous && !next) {
		// We get the thread after changes in case the thread is being updated in
		// this transaction. We defer to the permissions
		// for the ThreadRecord to ensure that a thread isn't updated
		// when it shouldn't be.
		let thread = getRecordMap(args.recordMapAfterChanges, {
			table: "thread",
			id: previous.thread_id,
		})

		if (thread && !thread.member_ids.includes(args.context.userId)) {
			return `MessageRecord#thread_id: you don't have permission to delete this message`
		}

		if (!thread) {
			thread = getRecordMap(args.recordMapBeforeChanges, {
				table: "thread",
				id: previous.thread_id,
			})
		}

		if (!thread) {
			// If we delete a thread we should delete all of it's messages.
			// If a thread doesn't exist in recordMapBeforeChanges for a message being deleted,
			// something has gone wrong. We should allow deletion of this message and log the error
			console.error("MessageRecord#thread_id: attempted to delete message for non-existant thread")
		}

		if (thread && !thread.member_ids.includes(args.context.userId)) {
			return `MessageRecord#thread_id: you don't have permission to delete this message`
		}
	}
}
