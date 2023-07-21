import * as fs from "fs-extra"
import { compact, sortBy } from "lodash"
import { TransactionConflictError } from "../shared/errors"
import { getRecordMap, setRecordMap } from "../shared/recordMapHelpers"
import {
	RecordMap,
	RecordPointer,
	RecordTable,
	RecordWithTable,
	TableToRecord,
	UserRecord,
} from "../shared/schema"
import { DatabaseApi } from "./database"
import { path } from "./path"

export class JsonDatabase implements DatabaseApi {
	data: RecordMap
	dbPath: string

	constructor() {
		this.dbPath = path("db/data.json")
		if (fs.existsSync(this.dbPath)) {
			this.data = fs.readJSONSync(this.dbPath)
		} else {
			this.data = {}
		}
	}

	async getRecord<T extends RecordTable>(
		pointer: RecordPointer<T>
	): Promise<TableToRecord[T] | undefined> {
		const record = getRecordMap(this.data, pointer)
		return record
	}

	async getRecords(pointers: RecordPointer[]): Promise<RecordMap> {
		const recordMap: RecordMap = {}
		for (const pointer of pointers) {
			const record = getRecordMap(this.data, pointer)
			if (record) setRecordMap(recordMap, pointer, record)
		}
		return recordMap
	}

	async getUserById(userId: string) {
		return this.data.user?.[userId]
	}

	async getUserByUsername(username: string) {
		for (const user of Object.values(this.data.user || {})) {
			if (!user) continue
			if (user.username === username) return user
		}
	}

	async getPassword(userId: string) {
		return this.data.password?.[userId]
	}

	async searchUsers(query: string): Promise<UserRecord[]> {
		const users: UserRecord[] = []
		for (const user of Object.values(this.data.user || {})) {
			if (!user) continue
			if (user.username.toLowerCase().indexOf(query.toLowerCase()) !== -1) users.push(user)
		}
		return users
	}

	async getMessageThread(messageId: string) {
		const message = this.data.message?.[messageId]
		if (!message) return
		return this.data.thread?.[message.thread_id]
	}

	// async getThreads(): Promise<ThreadRecord[]> {
	// 	const threads = compact(Object.values(this.data.thread || {}))
	// 	return sortBy(threads, (thread) => thread.replied_at)
	// }

	async getMessageIds(threadId: string, limit: number): Promise<string[]> {
		const messages = compact(Object.values(this.data.message || {})).filter(
			(message) => message.thread_id === threadId
		)
		// Newest messages first.
		return sortBy(messages, (message) => message.created_at)
			.map((message) => message.id)
			.reverse()
			.slice(0, limit)
	}

	async write(records: RecordWithTable[]): Promise<void> {
		// First, lets assert that the previous version lines up transactionally.
		for (const { table, id, record } of records) {
			const pointer = { table, id } as RecordPointer
			const current = getRecordMap(this.data, pointer)

			if (current && current.version !== record.last_version) throw new TransactionConflictError()
		}

		// No transaction conflict so lets update.
		for (const { table, id, record } of records) {
			const pointer = { table, id } as RecordPointer
			setRecordMap(this.data, pointer, record)
		}

		// Write the file.
		fs.mkdirpSync(path.dirname(this.dbPath))
		fs.writeJSONSync(this.dbPath, this.data)
	}
}
