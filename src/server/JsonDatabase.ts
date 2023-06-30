import * as fs from "fs-extra"
import { TransactionConflictError } from "../shared/errors"
import { RecordMapHelpers } from "../shared/recordMapHelpers"
import {
	RecordMap,
	RecordPointer,
	RecordTable,
	RecordValue,
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
		const record = RecordMapHelpers.getRecord(this.data, pointer)
		// @ts-ignore
		return record
	}

	async getRecords(pointers: RecordPointer[]): Promise<RecordMap> {
		const recordMap: RecordMap = {}
		for (const pointer of pointers) {
			const record = RecordMapHelpers.getRecord(this.data, pointer)
			if (record) RecordMapHelpers.setRecord(recordMap, pointer, record)
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

	// async getThreads(): Promise<ThreadRecord[]> {
	// 	const threads = compact(Object.values(this.data.thread || {}))
	// 	return sortBy(threads, (thread) => thread.replied_at)
	// }

	// async getMessages(threadId: string): Promise<MessageRecord[]> {
	// 	const messages = compact(Object.values(this.data.message || {})).filter(
	// 		(message) => message.thread_id === threadId
	// 	)
	// 	return sortBy(messages, (message) => message.created_at)
	// }

	async write(records: RecordWithTable[]): Promise<void> {
		// First, lets assert that the previous version lines up transactionally.
		for (const { table, id, record } of records) {
			const pointer = { table, id } as RecordPointer
			const current = RecordMapHelpers.getRecord(this.data, pointer) as RecordValue | undefined

			if (current && current.version !== record.last_version) throw new TransactionConflictError()
		}

		// No transaction conflict so lets update.
		for (const { table, id, record } of records) {
			const pointer = { table, id } as RecordPointer
			RecordMapHelpers.setRecord(this.data, pointer, record)
		}

		// Write the file.
		fs.mkdirpSync(path.dirname(this.dbPath))
		fs.writeJSONSync(this.dbPath, this.data)
	}
}
