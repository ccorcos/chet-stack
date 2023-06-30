/*

A local cache of records along with listeners for changes to those records.

*/

import { SecondMs } from "../shared/dateHelpers"
import { RecordMapHelpers } from "../shared/recordMapHelpers"
import { RecordMap, RecordPointer, RecordTable, RecordValue } from "../shared/schema"
import { sleep } from "../shared/sleep"

type RecordListener = () => void

export type RecordCacheApi = {
	getRecord<T extends RecordTable>(pointer: RecordPointer<T>): RecordValue<T> | undefined
	addListener(pointer: RecordPointer, fn: RecordListener): () => void
	updateRecordMap(recordMap: RecordMap): void
}

export class RecordCache implements RecordCacheApi {
	constructor(
		private args: {
			onSubscribe(pointer: RecordPointer): void
			onUnsubscribe(pointer: RecordPointer): void
		}
	) {}

	private recordMap: RecordMap = {}

	getRecord<T extends RecordTable>(pointer: RecordPointer<T>): RecordValue<T> | undefined {
		return RecordMapHelpers.getRecord(this.recordMap, pointer)
	}

	private unsubscribeMap: { [table: string]: { [id: string]: Promise<void> } } = {}
	private listeners: { [table: string]: { [id: string]: Set<RecordListener> } } = {}

	addListener(pointer: RecordPointer, fn: RecordListener): () => void {
		const listenerSet = RecordMapHelpers.getRecord(this.listeners, pointer) || new Set()
		const waitingUnsubscribe = RecordMapHelpers.getRecord(this.unsubscribeMap, pointer)

		if (waitingUnsubscribe) {
			RecordMapHelpers.deleteRecord(this.unsubscribeMap, pointer)
		} else if (listenerSet.size === 0) {
			this.args.onSubscribe(pointer)
		}

		listenerSet.add(fn)
		RecordMapHelpers.setRecord(this.listeners, pointer, listenerSet)

		return () => {
			listenerSet.delete(fn)
			if (listenerSet.size === 0) {
				let unsubscribe
				unsubscribe = (async () => {
					await sleep(10 * SecondMs)
					// If the promise was deleted from the unsubscribeMap, then don't unsubscribe.
					if (RecordMapHelpers.getRecord(this.unsubscribeMap, pointer) !== unsubscribe) return
					RecordMapHelpers.deleteRecord(this.listeners, pointer)
					this.args.onUnsubscribe(pointer)
				})()
				RecordMapHelpers.setRecord(this.unsubscribeMap, pointer, unsubscribe)
			}
		}
	}

	updateRecordMap(recordMap: RecordMap, force = false) {
		// Update only if they're new versions.
		const updates: RecordPointer[] = []
		for (const { table, id, record } of RecordMapHelpers.iterateRecordMap(recordMap)) {
			const existing = RecordMapHelpers.getRecord(this.recordMap, { table, id }) as
				| RecordValue
				| undefined
			if (force || !existing || existing.version < record.version) {
				RecordMapHelpers.setRecord(this.recordMap, { table, id }, record)
				updates.push({ table, id })
			}
		}

		// Fire listeners.
		for (const pointer of updates) {
			const listeners = RecordMapHelpers.getRecord(this.listeners, pointer)
			if (!listeners) continue
			for (const listener of listeners) listener()
		}
	}
}
