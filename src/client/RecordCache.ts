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
	return [table, id].join(":") as `${T}:${string}`
}

export function keyToPointer<T extends RecordTable>(key: `${T}:${string}`): RecordPointer<T>
export function keyToPointer(key: string): RecordPointer
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
	private cache: InMemoryCache

	constructor(
		private args: {
			environment: { recordCache: RecordCache }
			onSubscribe(threadId: string): void
			onUnsubscribe(threadId: string): void
		}
	) {
		this.cache = new InMemoryCache({
			onSubscribe: (threadId) => args.onSubscribe(threadId),
			onUnsubscribe: (threadId) => args.onUnsubscribe(threadId),
		})
	}

	get(threadId: string): { messages: string[]; latestTxId: string | undefined } | undefined {
		return this.cache.get(threadId)
	}

	subscribe(threadId: string, fn: () => void): () => void {
		return this.cache.subscribe(threadId, fn)
	}

	handleWrites(writes: RecordWithTable[], txId: string | undefined) {
		const threadIds = new Set<string>()

		for (const { table, record } of writes) {
			if (table === "message") {
				threadIds.add(record.thread_id)
			}
		}

		// It's important that whenever useSyncExternalStore calls getSnapshot, it should return
		// the same exact value. That's why we're going to cache it here at write time.
		// TODO: we should probably evaluate all of this lazily though. Or in batch.
		this.cache.write(
			Array.from(threadIds).map((threadId) => ({
				key: threadId,
				value: {
					messages: this.getMessages(threadId),
					latestTxId: txId,
				},
			}))
		)
	}

	private getMessages(threadId: string): string[] {
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

		return allMessages
	}
}
