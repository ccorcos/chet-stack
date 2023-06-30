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

	watchRecord<T extends RecordTable>(
		pointer: RecordPointer<T>
	): Observable<RecordValue<T> | undefined> {
		return {
			// TODO:
			// Currently, subscribing to a record doesn't fetch that record from the server.
			// We should consider integrating the loader into the cache so that the cache handles
			// fetching a record from the server as well as the cache. We'd also want to add network
			// strategies in that case to just fetch from the cache, just the server, etc, so this
			// would add some complexity.
			subscribe: (observer: ObservableObserver<RecordValue<T> | undefined>) => {
				if (!(observer instanceof Object) || observer == null) {
					throw new TypeError("Expected the observer to be an object.")
				}

				const handler =
					typeof observer === "function"
						? observer
						: observer.next &&
						  (observer.next.bind(observer) as (value: RecordValue<T> | undefined) => void)

				if (!handler) {
					return { unsubscribe() {} }
				}

				// immediately return the current value to the subscriber
				handler(getRecordMap(this.recordMap, pointer))

				// respond to record updates by emitting the updated value to the subscriber
				const unsubscribe = this.addListener(pointer, () => {
					const record = getRecordMap(this.recordMap, pointer)
					handler(record)
				})

				return { unsubscribe }
			},
			[Symbol.observable || "@@observable"]() {
				return this
			},
		}
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

// Note: This will add Symbol.observable globally for all TypeScript users,
// however, we are not polyfilling Symbol.observable. Ensuring the type for
// this global symbol is present is necessary for `observable()` to be
// properly typed for 3rd party library's like RXJS.
declare global {
	interface SymbolConstructor {
		readonly observable: symbol
	}
}

export interface Observable<T> {
	subscribe(observer: ObservableObserver<T>): {
		unsubscribe(): void
	}
	[Symbol.observable](): Observable<T>
}

export type ObservableObserver<T> =
	| ((v: T) => void)
	| {
			next?: (v: T) => void
			error?: (v: any) => void
			complete?: (v: boolean) => void
	  }
