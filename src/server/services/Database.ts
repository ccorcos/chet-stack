import * as fs from "fs-extra"
import { compact, isEqual, sortBy, uniqWith } from "lodash"
import { BatchedQueue } from "../../shared/BatchedQueue"
import { TransactionConflictError } from "../../shared/errors"
import { FuzzyMatch, computeMatchScore, fuzzyMatch } from "../../shared/fuzzyMatch"
import { deleteRecordMap, getRecordMap, setRecordMap } from "../../shared/recordMapHelpers"
import {
	AuthTokenRecord,
	PasswordRecord,
	RecordMap,
	RecordPointer,
	RecordTable,
	RecordValue,
	RecordWithTable,
	UserRecord,
	VersionMap,
} from "../../shared/schema"
import { Simplify } from "../../shared/typeHelpers"
import { path } from "../helpers/path"

export class Database {
	private data: RecordMap

	constructor(private dbPath: string) {
		if (fs.existsSync(this.dbPath)) {
			this.data = fs.readJSONSync(this.dbPath)
		} else {
			this.data = {}
		}
	}

	private save() {
		fs.mkdirpSync(path.dirname(this.dbPath))
		fs.writeJSONSync(this.dbPath, this.data)
	}

	private getRecordQueue = new BatchedQueue<RecordPointer, RecordValue | undefined>({
		processBatch: async (args) => {
			const pointers = uniqWith(args, isEqual)
			const recordMap = await this.getRecords(pointers)
			return args.map((pointer) => getRecordMap(recordMap, pointer))
		},
		maxBatchSize: 1000,
		maxParallel: 5,
		delayMs: 1,
	})

	/** This will batch requests efficiently into a single database query. */
	async getRecord<T extends RecordTable>(pointer: RecordPointer<T>) {
		const record = await this.getRecordQueue.enqueue(pointer as RecordPointer)
		return record as RecordValue<T> | undefined
	}

	async getRecords(pointers: RecordPointer[]): Promise<RecordMap> {
		const recordMap: RecordMap = {}
		for (const pointer of pointers) {
			const record = getRecordMap(this.data, pointer)
			if (record) setRecordMap(recordMap, pointer, record)
		}
		return recordMap
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

	async searchUsers(query: string) {
		const results: { user: UserRecord; match: FuzzyMatch }[] = []

		const users = sortBy(
			Object.values(this.data.user || {}).filter(Boolean) as UserRecord[],
			(user) => user!.id
		)
		for (const user of users) {
			const match = fuzzyMatch(query, user.username)
			if (match) results.push({ user, match })
		}
		return sortBy(results, (user) => computeMatchScore(user.match)).map((result) => result.user)
	}

	async getThreadIds(userId: string, limit: number): Promise<string[]> {
		const threads = compact(Object.values(this.data.thread || {})).filter(
			(thread) => thread.member_ids.includes(userId) && !thread.deleted
		)
		// Newest threads first.
		return sortBy(threads, (thread) => thread.replied_at)
			.map((thread) => thread.id)
			.reverse()
			.slice(0, limit)
	}

	async getMessageIds(threadId: string, limit: number): Promise<string[]> {
		const messages = compact(Object.values(this.data.message || {})).filter(
			(message) => message.thread_id === threadId && !message.deleted
		)
		// Newest messages first.
		return sortBy(messages, (message) => message.created_at)
			.map((message) => message.id)
			.reverse()
			.slice(0, limit)
	}

	async write(records: RecordWithTable[], versions: VersionMap): Promise<void> {
		// First, lets assert that the previous version lines up transactionally.
		for (const { table, id, record } of records) {
			const pointer = { table, id } as RecordPointer
			const current = getRecordMap(this.data, pointer)

			if (current) {
				const lastVersion = getRecordMap(versions, pointer)
				if (current.version !== lastVersion) throw new TransactionConflictError()
			}
		}

		// No transaction conflict so lets update.
		for (const { table, id, record } of records) {
			const pointer = { table, id } as RecordPointer
			setRecordMap(this.data, pointer, record)
		}

		// Write the file.
		this.save()
	}

	async createAuthToken(token: AuthTokenRecord) {
		setRecordMap(this.data, { table: "auth_token", id: token.id }, token)
		this.save()
	}

	async createPassword(password: PasswordRecord) {
		setRecordMap(this.data, { table: "password", id: password.id }, password)
		this.save()
	}

	async deleteAuthToken(authTokenId: string) {
		deleteRecordMap(this.data, { table: "auth_token", id: authTokenId })
		this.save()
	}

	async reset() {
		this.data = {}
		this.save()
	}
}

export type DatabaseApi = Simplify<Database>
