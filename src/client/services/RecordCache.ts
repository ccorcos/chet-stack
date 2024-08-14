/*

A local cache of records along with listeners for changes to those records.

*/

import { differenceWith, isEqual, uniq } from "lodash"
import {
	InMemoryTupleStorage,
	TupleDatabase,
	TupleDatabaseClient,
	TupleTransactionApi,
	namedTupleToObject,
} from "tuple-database"
import { iterateRecordMap } from "../../shared/recordMapHelpers"
import { RecordMap, RecordPointer, RecordTable, RecordValue } from "../../shared/schema"

type RecordChange<T extends RecordTable = RecordTable> = {
	[K in T]: {
		table: K
		id: string
		before: RecordValue<K> | undefined
		after: RecordValue<K> | undefined
	}
}[T]

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

type RecordCacheSchema = RecordTuples | GetMessagesIndexTuple | GetThreadsIndexTuple

export class RecordCache {
	private db = new TupleDatabaseClient<RecordCacheSchema>(
		new TupleDatabase(new InMemoryTupleStorage())
	)

	// Records by primary index.
	getRecord<T extends RecordTable>(pointer: RecordPointer<T>): RecordValue<T> | undefined {
		return this.db.get(["record", pointer.table, pointer.id]) as RecordValue<T> | undefined
	}

	subscribeRecord<T extends RecordTable>(pointer: RecordPointer<T>, fn: () => void): () => void {
		return this.db.subscribe(
			{ gte: ["record", pointer.table, pointer.id], lte: ["record", pointer.table, pointer.id] },
			fn
		)
	}

	writeRecordMap(recordMap: RecordMap, force = false) {
		const tx = this.db.transact()

		for (const { table, id, record } of iterateRecordMap(recordMap)) {
			const existing = tx.get(["record", table, id])
			if (force || !existing || existing.version < record.version) {
				// Write primary index.
				tx.set(["record", table, id], record)

				// Write secondary indexes.
				const change = { id, table, before: existing, after: record } as RecordChange
				this.indexMessages(tx, change)
				this.indexThreads(tx, change)
			}
		}

		tx.commit()
	}

	purgeRecords(pointers: RecordPointer[]) {
		const tx = this.db.transact()

		for (const pointer of pointers) {
			// Write primary index.
			tx.remove(["record", pointer.table, pointer.id])

			// Write secondary indexes.
			const before = this.getRecord(pointer)
			const change = { ...pointer, before, after: undefined } as RecordChange
			this.indexMessages(tx, change)
			this.indexThreads(tx, change)
		}

		tx.commit()
	}

	// getMessages index.
	private getMessagesCache = new Map<string, { messageIds: string[] }>()

	/** Must use a stable args object for useSyncExternalStore to work without infinite looping. */
	getMessages(threadId: string) {
		const cached = this.getMessagesCache.get(threadId)
		if (cached) return cached

		const messageIds = this.db
			.subspace(["index", "getMessages", { threadId }])
			.scan({ reverse: true })
			.map(({ key }) => namedTupleToObject(key))
			.map(({ messageId }) => messageId)

		const result = { messageIds }

		this.getMessagesCache.set(threadId, result)
		return result
	}

	subscribeMessages(threadId: string, fn: () => void): () => void {
		return this.db.subscribe({ prefix: ["index", "getMessages", { threadId }] }, fn)
	}

	// TODO: consolidate with RecordStorage
	private indexMessages(tx: TupleTransactionApi<RecordCacheSchema>, change: RecordChange) {
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

		// Cleanup the cache (React useSyncExternalStore idiosyncrasy)
		const threadId = before?.thread_id || after?.thread_id
		if (threadId) this.getMessagesCache.delete(threadId)

		if (beforeKey) tx.remove(beforeKey)
		if (afterKey) tx.set(afterKey, undefined)
	}

	// getThreads index.
	private getThreadsCache = new Map<string, { threadIds: string[] }>()

	/* I really don't like how useSyncExternalStore requires a stable object to work without infinite
	 * looping. This caching mechanism is a workaround for now.
	 */
	getThreads(userId: string) {
		const cached = this.getThreadsCache.get(userId)
		if (cached) return cached

		const threadIds = this.db
			.subspace(["index", "getThreads", { userId }])
			.scan({ reverse: true })
			.map(({ key }) => namedTupleToObject(key))
			.map(({ threadId }) => threadId)

		const result = { threadIds }

		this.getThreadsCache.set(userId, result)
		return result
	}

	subscribeThreads(userId: string, fn: () => void): () => void {
		return this.db.subscribe({ prefix: ["index", "getThreads", { userId }] }, fn)
	}

	// TODO: consolidate with RecordStorage
	private indexThreads(tx: TupleTransactionApi<RecordCacheSchema>, change: RecordChange) {
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
		const oldKeys = differenceWith(beforeTuples, afterTuples, isEqual)

		for (const oldKey of oldKeys) tx.remove(oldKey)
		for (const newKey of newKeys) tx.set(newKey, undefined)

		// Cleanup the cache (React useSyncExternalStore idiosyncrasy)
		const userIds = uniq([...oldKeys, ...newKeys].map(([_0, _1, { userId }]) => userId))
		for (const userId of userIds) this.getThreadsCache.delete(userId)
	}

	reset() {
		while (true) {
			const tuples = this.db.scan({ limit: 100 })
			if (tuples.length === 0) break
			const tx = this.db.transact()
			for (const tuple of tuples) tx.remove(tuple.key)
			tx.commit()
		}
	}
}
