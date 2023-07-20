/*

A local cache of records along with listeners for changes to those records.

*/

import { iterateRecordMap } from "../shared/recordMapHelpers"
import {
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

	updateRecordMap(recordMap: RecordMap, force = false) {
		// Update only if they're new versions.
		const recordWrites: RecordWithTable[] = []

		for (const { table, id, record } of iterateRecordMap(recordMap)) {
			const existing = this.get({ table, id })
			if (force || !existing || existing.version < record.version) {
				recordWrites.push({ table, id, record } as RecordWithTable)
			}
		}

		// TODO: this is where we'd add some indexing capabilities.
		const writes = recordWrites.map(({ table, id, record }) => ({
			key: pointerToKey({ table, id }),
			value: record,
		}))

		this.cache.write(writes)
	}

	// getMessages(args: { threadId: string }) {
	// 	const { threadId } = args
	// 	const messageIds: string[] = []
	// 	for (const { table, id, record } of iterateRecordMap(this.recordMap)) {
	// 	}
	// 	this.db.iterate((key, value) => {
	// 		const [table, id] = key.split(":") as [RecordTable, string]
	// 		if (table !== "message") return
	// 		const message = value as MessageRecord
	// 		if (message.thread_id !== threadId) return
	// 		messages.push(message)
	// 	})
	// 	return messages
	// }
}
