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
	updateRecordMap(recordMap: RecordMap): void
}

function pointerToKey<T extends RecordTable>({ table, id }: RecordPointer<T>) {
	return [table, id].join(":")
}

function keyToPointer(key: string) {
	const [table, id] = key.split(":")
	return { table, id } as RecordPointer
}

export class RecordCache implements RecordCacheApi {
	private cache: InMemoryCache

	getMessagesIndex: getMessagesIndex

	constructor(args: {
		onSubscribe(pointer: RecordPointer): void
		onUnsubscribe(pointer: RecordPointer): void
	}) {
		this.cache = new InMemoryCache({
			onSubscribe: (key) => args.onSubscribe(keyToPointer(key)),
			onUnsubscribe: (key) => args.onUnsubscribe(keyToPointer(key)),
		})
		this.getMessagesIndex = new getMessagesIndex(this.cache)
	}

	get<T extends RecordTable>(pointer: RecordPointer<T>): RecordValue<T> | undefined {
		return this.cache.get(pointerToKey(pointer))
	}

	subscribe<T extends RecordTable>(pointer: RecordPointer<T>, fn: RecordListener<T>): () => void {
		return this.cache.subscribe(pointerToKey(pointer), fn)
	}

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

		this.getMessagesIndex.afterWrite(recordWrites)
	}
}

class getMessagesIndex {
	constructor(private cache: InMemoryCache) {}

	private listeners = new Map<string, Set<() => void>>()

	subscribe(threadId: string, fn: () => void): () => void {
		const listenerSet = this.listeners.get(threadId) || new Set()
		listenerSet.add(fn)
		this.listeners.set(threadId, listenerSet)
		return () => {
			listenerSet.delete(fn)
		}
	}

	emit(threadId: string) {
		const listenerSet = this.listeners.get(threadId)
		if (!listenerSet) return
		for (const listener of listenerSet) listener()
	}

	afterWrite(writes: RecordWithTable[]) {
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

	get(threadId: string) {
		const messages: MessageRecord[] = []

		this.cache.iterate((key, value) => {
			const { table, id } = keyToPointer(key)
			if (table !== "message") return
			const message = value as MessageRecord
			if (message.thread_id !== threadId) return
			messages.push(message)
		})

		return sortBy(messages, (message) => message.created_at).map((message) => message.id)
	}
}
