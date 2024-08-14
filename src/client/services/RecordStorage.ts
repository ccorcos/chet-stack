import { differenceWith, isEqual, sortBy } from "lodash"
import {
	AsyncTupleDatabase,
	AsyncTupleDatabaseClient,
	namedTupleToObject,
	transactionalReadAsync,
	transactionalReadWriteAsync,
} from "tuple-database"
import { IndexedDbTupleStorage } from "tuple-database/storage/IndexedDbTupleStorage"
import { FuzzyMatch, computeMatchScore, fuzzyMatch } from "../../shared/fuzzyMatch"
import { iterateRecordMap } from "../../shared/recordMapHelpers"
import {
	MessageRecord,
	RecordMap,
	RecordPointer,
	RecordTable,
	RecordValue,
	ThreadRecord,
	UserRecord,
} from "../../shared/schema"

const debug = (...args: any[]) => {
	// console.log("recordStorage:", ...args)
}

type StorageVersion = { key: ["version"]; value: number }

type RecordTuples = {
	[K in RecordTable]: { key: ["record", K, string]; value: RecordValue<K> }
}[RecordTable]

type GetMessagesIndexTuple = {
	key: ["index", "getMessages", { threadId: string }, { createdAt: string }, { messageId: string }]
	value: undefined
}

type GetThreadsIndexTuple = {
	key: ["index", "getThreads", { userId: string }, { repliedAt: string }, { threadId: string }]
	value: undefined
}

type RecordStorageSchema =
	| StorageVersion
	| RecordTuples
	| GetMessagesIndexTuple
	| GetThreadsIndexTuple

type RecordChange<T extends RecordTable = RecordTable> = {
	[K in T]: {
		table: K
		id: string
		before: RecordValue<K> | undefined
		after: RecordValue<K> | undefined
	}
}[T]

// Writing this with transactionalReadWriteAsync is important because it will handle retries!
const writeRecordMap = transactionalReadWriteAsync<RecordStorageSchema>()(
	async (tx, recordMap: RecordMap, force = false) => {
		for (const { table, id, record } of iterateRecordMap(recordMap)) {
			const existing = await tx.get(["record", table, id])

			if (force || !existing || existing.version < record.version) {
				// Write primary index.
				tx.set(["record", table, id], record)

				// Write secondary indexes.
				const change = { id, table, before: existing, after: record } as RecordChange
				await indexMessages(tx, change)
				await indexThreads(tx, change)
			}
		}
	}
)

// TODO: consolidate this logic with the RecordCache.
const indexMessages = transactionalReadWriteAsync<RecordStorageSchema>()(
	async (tx, change: RecordChange) => {
		const { before, after, table } = change
		if (table !== "message") return

		let beforeKey: GetMessagesIndexTuple["key"] | undefined
		let afterKey: GetMessagesIndexTuple["key"] | undefined

		if (before && !before.deleted) {
			const { id: messageId, thread_id: threadId, created_at: createdAt } = before
			beforeKey = ["index", "getMessages", { threadId }, { createdAt }, { messageId }]
		}
		if (after && !after.deleted) {
			const { id: messageId, thread_id: threadId, created_at: createdAt } = after
			afterKey = ["index", "getMessages", { threadId }, { createdAt }, { messageId }]
		}

		// No update to the index!
		if (isEqual(beforeKey, afterKey)) return

		if (beforeKey) tx.remove(beforeKey)
		if (afterKey) tx.set(afterKey, undefined)
	}
)

// TODO: consolidate this logic with the RecordCache.
const indexThreads = transactionalReadWriteAsync<RecordStorageSchema>()(
	async (tx, change: RecordChange) => {
		const { before, after, table } = change
		if (table !== "thread") return

		const beforeTuples: GetThreadsIndexTuple["key"][] = []
		const afterTuples: GetThreadsIndexTuple["key"][] = []

		if (before && !before.deleted) {
			const { id: threadId, replied_at: repliedAt, member_ids } = before
			for (const userId of member_ids) {
				beforeTuples.push(["index", "getThreads", { userId }, { repliedAt }, { threadId }])
			}
		}
		if (after && !after.deleted) {
			const { id: threadId, replied_at: repliedAt, member_ids } = after
			for (const userId of member_ids) {
				afterTuples.push(["index", "getThreads", { userId }, { repliedAt }, { threadId }])
			}
		}
		const newKeys = differenceWith(afterTuples, beforeTuples, isEqual)
		const oldKeys = differenceWith(afterTuples, beforeTuples, isEqual)

		for (const oldKey of oldKeys) tx.remove(oldKey)
		for (const newKey of newKeys) tx.set(newKey, undefined)
	}
)

// This is transactional because a message could get updated in between fetching the
// id from the getMessages index and fetching the record.
const getMessages = transactionalReadAsync<RecordStorageSchema>()(
	async (tx, args: { threadId: string; limit: number }) => {
		const { threadId, limit } = args
		const result = await tx
			.subspace(["index", "getMessages", { threadId }])
			.scan({ reverse: true, limit })

		const messageIds = result
			.map(({ key }) => namedTupleToObject(key))
			.map(({ messageId }) => messageId)

		const allMessages = await Promise.all(
			messageIds.map((id) => tx.get(["record", "message", id]) as Promise<MessageRecord>)
		)

		return allMessages
	}
)

const getThreads = transactionalReadAsync<RecordStorageSchema>()(
	async (tx, args: { limit: number }) => {
		const { limit } = args
		const result = await tx.subspace(["index", "getThreads"]).scan({ reverse: true, limit })

		const threadIds = result
			.map(({ key }) => namedTupleToObject(key))
			.map(({ threadId }) => threadId)

		const allThreads = await Promise.all(
			threadIds.map((id) => tx.get(["record", "thread", id]) as Promise<ThreadRecord>)
		)

		return allThreads
	}
)

const searchUsers = transactionalReadAsync<RecordStorageSchema>()(
	async (tx, args: { query: string }) => {
		const tuples = await tx.subspace(["record", "user"]).scan()
		const users = tuples.map((result) => result.value)

		const results = sortBy(users, (user) => user.id)
			.map((user) => {
				const match = fuzzyMatch(args.query, user.username)
				return { match, user }
			})
			.filter((result) => Boolean(result.match)) as { match: FuzzyMatch; user: UserRecord }[]

		return sortBy(results, (user) => computeMatchScore(user.match)).map((result) => result.user)
	}
)

export class RecordStorage {
	private db = new AsyncTupleDatabaseClient<RecordStorageSchema>(
		new AsyncTupleDatabase(new IndexedDbTupleStorage("recordStorage"))
	)

	constructor() {
		this.ready = this.migrateIfNeeded()
	}

	private ready: Promise<void>
	private async migrateIfNeeded() {
		let version = await this.db.get(["version"])
		version = version || 0

		if (version === 0) {
			// Upgrade to version 1 when it's time.
		}
	}

	// Records by primary index.
	async getRecord<T extends RecordTable>(
		pointer: RecordPointer<T>
	): Promise<RecordValue<T> | undefined> {
		await this.ready
		const result = await this.db.get(["record", pointer.table, pointer.id])
		if (result) debug("hit", ["record", pointer.table, pointer.id])
		else debug("miss", ["record", pointer.table, pointer.id])
		return result as RecordValue<T> | undefined
	}

	async writeRecordMap(recordMap: RecordMap, force = false) {
		await this.ready
		await writeRecordMap(this.db, recordMap, force)
	}

	async getMessages(args: { threadId: string; limit: number }) {
		await this.ready
		return getMessages(this.db, args)
	}

	async getThreads(args: { limit: number }) {
		await this.ready
		return getThreads(this.db, args)
	}

	async searchUsers(args: { query: string }) {
		await this.ready
		return searchUsers(this.db, args)
	}

	async reset() {
		await this.ready
		while (true) {
			const tuples = await this.db.scan({ limit: 100 })
			if (tuples.length === 0) break
			const tx = this.db.transact()
			for (const tuple of tuples) tx.remove(tuple.key)
			await tx.commit()
		}
	}
}
