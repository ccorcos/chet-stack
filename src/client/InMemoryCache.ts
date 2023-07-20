import { SecondMs } from "../shared/dateHelpers"
import { sleep } from "../shared/sleep"

type CacheListener = (value: any) => void

export type InMemoryCacheApi = {
	get(key: string): any
	subscribe(key: string, fn: CacheListener): () => void
	write(args: { key: string; value: any }[]): void
	/** Return false to stop early */
	iterate(callback: (key: string, value: any) => boolean | void): void
}

const DelayMs = 10 * SecondMs

export class InMemoryCache implements InMemoryCacheApi {
	constructor(
		private args?: {
			onSubscribe?(key: string): void
			onUnsubscribe?(key: string): void
		}
	) {}

	private data = new Map<string, any>()

	get(key: string): any {
		return this.data.get(key)
	}

	private listeners = new Map<string, Set<CacheListener>>()
	private delayedUnsubscribe = new Map<string, Promise<void>>()

	subscribe(key: string, fn: CacheListener): () => void {
		const listenerSet = this.listeners.get(key) || new Set()
		const waitingUnsubscribe = this.delayedUnsubscribe.get(key)

		if (waitingUnsubscribe) {
			this.delayedUnsubscribe.delete(key)
		} else if (listenerSet.size === 0) {
			this.args?.onSubscribe?.(key)
		}

		listenerSet.add(fn)
		this.listeners.set(key, listenerSet)

		return () => {
			listenerSet.delete(fn)
			this.cleanupAfterDelay(key)
		}
	}

	private cleanupAfterDelay(key: string) {
		const listenerSet = this.listeners.get(key)

		// If there are  existing listeners, then don't cleanup.
		if (!listenerSet || listenerSet.size > 0) return

		let unsubscribe
		unsubscribe = (async () => {
			await sleep(DelayMs)
			// If the promise was deleted from the delayedUnsubscribe, then don't unsubscribe.
			if (this.delayedUnsubscribe.get(key) !== unsubscribe) return
			this.delayedUnsubscribe.delete(key)

			// Delete data from the cache.
			this.data.delete(key)
			this.args?.onUnsubscribe?.(key)
		})()

		this.delayedUnsubscribe.set(key, unsubscribe)
	}

	private emit(key: string, value: any) {
		const listenerSet = this.listeners.get(key)
		if (!listenerSet) return
		for (const listener of listenerSet) listener(value)
	}

	write(args: { key: string; value: any }[]): void {
		// Make all writes before emitting.
		for (const { key, value } of args) {
			this.data.set(key, value)
		}

		for (const { key, value } of args) {
			this.emit(key, value)
		}

		for (const { key, value } of args) {
			this.cleanupAfterDelay(key)
		}
	}

	/** Return false to stop early */
	iterate(callback: (key: string, value: any) => boolean | void): void {
		for (let [key, value] of this.data) {
			if (callback(key, value) === false) {
				break
			}
		}
	}
}
