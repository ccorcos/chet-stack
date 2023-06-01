import * as fs from "fs-extra"
import { compact, sortBy } from "lodash"
import { getRecordMap, setRecordMap } from "../shared/recordMapHelpers"
import {
	MessageRecord,
	RecordMap,
	RecordPointer,
	RecordValue,
	RecordWithTable,
	ThreadRecord,
} from "../shared/schema"
import { DatabaseApi } from "./database"
import { TransactionConflictError } from "./errors"
import { path } from "./path"

export class JsonDatabase implements DatabaseApi {
	data: RecordMap

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

	async getRecords(pointers: RecordPointer[]): Promise<RecordMap> {
		const recordMap: RecordMap = {}
		for (const pointer of pointers) {
			const record = getRecordMap(this.data, pointer)
			if (record) setRecordMap(recordMap, pointer, record)
		}
		return recordMap
	}

	async write(records: RecordWithTable[]): Promise<void> {
		// First, lets assert that the previous version lines up transactionally.
		for (const { table, id, record } of records) {
			const pointer = { table, id } as RecordPointer
			const current = getRecordMap(this.data, pointer) as
				| RecordValue
				| undefined

			if (current && current.version !== record.last_version)
				throw new TransactionConflictError()
		}

		// No transaction conflict so lets update.
		for (const { table, id, record } of records) {
			const pointer = { table, id } as RecordPointer
			setRecordMap(this.data, pointer, record)
		}
	}
}
