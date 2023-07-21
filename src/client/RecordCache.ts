/*

A local cache of records along with listeners for changes to those records.

*/

import { sortBy } from "lodash"
import { iterateRecordMap } from "../shared/recordMapHelpers"
import {
	MessageRecord,
	RecordMap,
	RecordPointer,
	RecordTable,
	RecordValue,
	RecordWithTable,
} from "../shared/schema"
import { InMemoryCache } from "./InMemoryCache"

type RecordListener<T extends RecordTable> = (value: RecordValue<T>) => void

export type RecordCacheApi = {
	get<T extends RecordTable>(pointer: RecordPointer<T>): RecordValue<T> | undefined
	subscribe<T extends RecordTable>(pointer: RecordPointer<T>, fn: RecordListener<T>): () => void
	updateRecordMap(recordMap: RecordMap): RecordWithTable[]
	iterateRecords(callback: (value: RecordWithTable) => boolean | void): void
}

export function pointerToKey<T extends RecordTable>({ table, id }: RecordPointer<T>) {
	return [table, id].join(":")
}

export function keyToPointer(key: string) {
	const [table, id] = key.split(":")
	return { table, id } as RecordPointer
}

export class RecordCache implements RecordCacheApi {
	private cache: InMemoryCache

	constructor(args: {
		onSubscribe(pointer: RecordPointer): void
		onUnsubscribe(pointer: RecordPointer): void
	}) {
		this.cache = new InMemoryCache({
			onSubscribe: (key) => args.onSubscribe(keyToPointer(key)),
			onUnsubscribe: (key) => args.onUnsubscribe(keyToPointer(key)),
		})
	}

	get<T extends RecordTable>(pointer: RecordPointer<T>): RecordValue<T> | undefined {
		return this.cache.get(pointerToKey(pointer))
	}

	subscribe<T extends RecordTable>(pointer: RecordPointer<T>, fn: RecordListener<T>): () => void {
		return this.cache.subscribe(pointerToKey(pointer), fn)
	}

	// TODO?: source: "api" | "cache"
	updateRecordMap(recordMap: RecordMap, force = false) {
		// Update only if they're new versions.
		const recordWrites: RecordWithTable[] = []

		for (const { table, id, record } of iterateRecordMap(recordMap)) {
			const existing = this.get({ table, id })
			if (force || !existing || existing.version < record.version) {
				recordWrites.push({ table, id, record } as RecordWithTable)
			}
		}

		const writes = recordWrites.map(({ table, id, record }) => ({
			key: pointerToKey({ table, id }),
			value: record,
		}))

		this.cache.write(writes)

		return recordWrites
	}

	iterateRecords(callback: (value: RecordWithTable) => boolean | void): void {
		return this.cache.iterate((key, record) => {
			const pointer = keyToPointer(key)
			const value = { ...pointer, record } as RecordWithTable
			return callback(value)
		})
	}
}

export class GetMessagesCache {
	constructor(
		private args: {
			environment: { recordCache: RecordCache }
			onSubscribe(threadId: string): void
			onUnsubscribe(threadId: string): void
		}
	) {}

	private listeners = new Map<string, Set<() => void>>()

	subscribe(threadId: string, fn: () => void): () => void {
		const listenerSet = this.listeners.get(threadId) || new Set()
		listenerSet.add(fn)
		this.listeners.set(threadId, listenerSet)
		this.args.onSubscribe(threadId)
		return () => {
			listenerSet.delete(fn)
			this.args.onUnsubscribe(threadId)
		}
	}

	emit(threadId: string) {
		delete this.cache[threadId]
		const listenerSet = this.listeners.get(threadId)
		if (!listenerSet) return
		for (const listener of listenerSet) listener()
	}

	handleWrites(writes: RecordWithTable[]) {
		const threadIds = new Set<string>()

		for (const { table, id, record } of writes) {
			if (table === "message") {
				threadIds.add(record.thread_id)
			}
		}

		for (const threadId of threadIds) {
			this.emit(threadId)
		}
	}

	// Caching the results here so that getSnapshot from useSyncExternalStore will receive the same value.
	cache: {
		[threadId: string]: { [limit: number]: { messageIds: string[]; nextId: string | undefined } }
	} = {}

	getMessages(threadId: string, limit: number) {
		const cached = this.cache[threadId]?.[limit]
		if (cached) return cached

		const messages: MessageRecord[] = []

		this.args.environment.recordCache.iterateRecords(({ table, record }) => {
			if (table !== "message") return
			const message = record
			if (message.thread_id !== threadId) return
			messages.push(message)
		})

		// Newset messages first.
		const allMessages = sortBy(messages, (message) => message.created_at)
			.map((message) => message.id)
			.reverse()

		const result = {
			messageIds: allMessages.slice(0, limit),
			nextId: allMessages[limit],
		}

		if (this.cache[threadId]) this.cache[threadId][limit] = result
		else this.cache[threadId] = { [limit]: result }

		return result
	}
}
