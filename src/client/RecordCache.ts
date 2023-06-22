/*

A local cache of records along with listeners for changes to those records.

*/

import {
	deleteRecordMap,
	getRecordMap,
	iterateRecordMap,
	setRecordMap,
} from "../shared/recordMapHelpers"
import { RecordMap, RecordPointer, RecordTable, RecordValue } from "../shared/schema"

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

	recordMap: RecordMap = {}

	getRecord<T extends RecordTable>(pointer: RecordPointer<T>): RecordValue<T> | undefined {
		// @ts-ignore
		return getRecordMap(this.recordMap, pointer)
	}

	listeners: { [table: string]: { [id: string]: Set<RecordListener> } } = {}
	addListener(pointer: RecordPointer, fn: RecordListener): () => void {
		const listenerSet = getRecordMap(this.listeners, pointer) || new Set()
		if (listenerSet.size === 0) {
			this.args.onSubscribe(pointer)
		}
		listenerSet.add(fn)
		setRecordMap(this.listeners, pointer, listenerSet)

		return () => {
			listenerSet.delete(fn)
			if (listenerSet.size === 0) {
				deleteRecordMap(this.listeners, pointer)
				this.args.onUnsubscribe(pointer)
			}
		}
	}

	updateRecordMap(recordMap: RecordMap, force = false) {
		// Update only if they're new versions.
		const updates: RecordPointer[] = []
		for (const { table, id, record } of iterateRecordMap(recordMap)) {
			const existing = getRecordMap(this.recordMap, { table, id }) as RecordValue | undefined
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
