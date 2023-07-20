import { openDB } from "idb"
import { iterateRecordMap } from "../shared/recordMapHelpers"
import { MessageRecord, RecordMap, RecordPointer, RecordTable, RecordValue } from "../shared/schema"

const debug = (...args: any[]) => console.log("STORAGE:", ...args)

export class RecordStorage {
	private db = new IndexedDbKeyValueStore("app", "records")

	async getRecord<T extends RecordTable>(pointer: RecordPointer<T>) {
		const key = [pointer.table, pointer.id].join(":")
		const result = await this.db.get(key)
		if (result) debug("hit", key)
		else debug("miss", key)
		return result as RecordValue<T> | undefined
	}

	async setRecord<T extends RecordTable>(pointer: RecordPointer<T>, value: RecordValue<T>) {
		const key = [pointer.table, pointer.id].join(":")
		debug("set", key)
		await this.db.set(key, value)
	}

	async updateRecordMap(recordMap: RecordMap, force = false) {
		// TODO: technically, we need an async queue to ensure we don't have concurrency issues here.
		for (const { table, id, record } of iterateRecordMap(recordMap)) {
			const existing = (await this.getRecord({ table, id })) as RecordValue | undefined
			// Update only if they're new versions.
			if (force || !existing || existing.version < record.version) {
				await this.setRecord({ table, id }, record)
			}
		}
	}

	async getMessages(args: { threadId: string }) {
		const { threadId } = args
		const messages: MessageRecord[] = []
		this.db.iterate((key, value) => {
			const [table, id] = key.split(":") as [RecordTable, string]
			if (table !== "message") return
			const message = value as MessageRecord
			if (message.thread_id !== threadId) return
			messages.push(message)
		})
		return messages
	}
}

class IndexedDbKeyValueStore<K extends IDBValidKey = string, V = any> {
	constructor(private dbName: string, private storeName: string) {}

	private async getDb() {
		return openDB(this.dbName, 1, {
			upgrade: (db) => {
				db.createObjectStore(this.storeName)
			},
		})
	}

	async set(key: K, val: V) {
		const db = await this.getDb()
		return db.put(this.storeName, val, key)
	}

	async get(key: K): Promise<V> {
		const db = await this.getDb()
		return db.get(this.storeName, key)
	}

	async delete(key: K) {
		const db = await this.getDb()
		return db.delete(this.storeName, key)
	}

	async clear() {
		const db = await this.getDb()
		return db.clear(this.storeName)
	}

	async iterate(callback: (key: K, value: V) => boolean | void) {
		const db = await this.getDb()
		let cursor = await db.transaction(this.storeName).store.openCursor()

		while (cursor) {
			if (callback(cursor.key as K, cursor.value) === false) {
				break
			}
			cursor = await cursor.continue()
		}
	}
}
