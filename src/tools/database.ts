import * as fs from "fs-extra"
import { compact, sortBy } from "lodash"
import {
	MessageRecord,
	RecordMap,
	ThreadRecord,
	UserRecord,
} from "../shared/schema"
import { path } from "./path"

export type DatabaseApi = {
	getUser(userId: string): Promise<UserRecord | undefined>
	getThreads(): Promise<ThreadRecord[]>
	getMessages(threadId: string): Promise<MessageRecord[]>
}

export class Database implements DatabaseApi {
	data: RecordMap = {}

	constructor() {
		this.data = fs.readJSONSync(path("db/data.json")) || {}
	}

	async getUser(userId: string) {
		return this.data.user?.[userId]
	}

	async getThreads(): Promise<ThreadRecord[]> {
		const threads = compact(Object.values(this.data.thread || {}))
		return sortBy(threads, (thread) => thread.replied_at)
	}

	async getMessages(threadId: string): Promise<MessageRecord[]> {
		const messages = compact(Object.values(this.data.message || {})).filter(
			(message) => message.thread_id === threadId
		)
		return sortBy(messages, (message) => message.created_at)
	}
}
