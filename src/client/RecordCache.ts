/*

A local cache of records along with listeners for changes to those records.

*/

import { SecondMs } from "../shared/dateHelpers"
import {
	deleteRecordMap,
	getRecordMap,
	iterateRecordMap,
	setRecordMap,
} from "../shared/recordMapHelpers"
import { RecordMap, RecordPointer, RecordTable, RecordValue } from "../shared/schema"
import { sleep } from "../shared/sleep"

type RecordListener = () => void

export type RecordCacheApi = {
	getRecord<T extends RecordTable>(pointer: RecordPointer<T>): RecordValue<T> | undefined
	addListener(pointer: RecordPointer, fn: RecordListener): () => void
	updateRecordMap(recordMap: RecordMap): void
}

// TODO: at some point, use a more generic API
// type CacheApi = {
// 	get(key: string): Promise<any>
// 	addListener(key: string, fn: (value: any) => void): () => void
// 	set(key: string, val: any): Promise<void>
// 	delete(key: string): Promise<void>
// 	clear(): Promise<void>
// 	/** Return true to stop early */
// 	iterate(callback: (key: string, value: any) => boolean | void): Promise<void>
// }

export class RecordCache implements RecordCacheApi {
	constructor(
		private args: {
			onSubscribe(pointer: RecordPointer): void
			onUnsubscribe(pointer: RecordPointer): void
		}
	) {}

	private recordMap: RecordMap = {}

	getRecord<T extends RecordTable>(pointer: RecordPointer<T>): RecordValue<T> | undefined {
		return getRecordMap(this.recordMap, pointer)
	}

	private unsubscribeMap: { [table: string]: { [id: string]: Promise<void> } } = {}
	private listeners: { [table: string]: { [id: string]: Set<RecordListener> } } = {}

	addListener(pointer: RecordPointer, fn: RecordListener): () => void {
		const listenerSet = getRecordMap(this.listeners, pointer) || new Set()
		const waitingUnsubscribe = getRecordMap(this.unsubscribeMap, pointer)

		if (waitingUnsubscribe) {
			deleteRecordMap(this.unsubscribeMap, pointer)
		} else if (listenerSet.size === 0) {
			this.args.onSubscribe(pointer)
		}

		listenerSet.add(fn)
		setRecordMap(this.listeners, pointer, listenerSet)

		return () => {
			listenerSet.delete(fn)
			if (listenerSet.size === 0) {
				let unsubscribe
				unsubscribe = (async () => {
					await sleep(10 * SecondMs)
					// If the promise was deleted from the unsubscribeMap, then don't unsubscribe.
					if (getRecordMap(this.unsubscribeMap, pointer) !== unsubscribe) return
					deleteRecordMap(this.listeners, pointer)
					this.args.onUnsubscribe(pointer)
				})()
				setRecordMap(this.unsubscribeMap, pointer, unsubscribe)
			}
		}
	}

	updateRecordMap(recordMap: RecordMap, force = false) {
		// Update only if they're new versions.
		const updates: RecordPointer[] = []
		for (const { table, id, record } of iterateRecordMap(recordMap)) {
			const existing = getRecordMap(this.recordMap, { table, id })
			if (force || !existing || existing.version < record.version) {
				setRecordMap(this.recordMap, { table, id }, record)
				updates.push({ table, id })
			}
		}

		// Fire listeners.
		for (const pointer of updates) {
			const listeners = getRecordMap(this.listeners, pointer)
			if (!listeners) continue
			for (const listener of listeners) listener()
		}
	}
}
