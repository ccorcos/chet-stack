import { differenceWith, isEqual } from "lodash"
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react"
import { toSubscriptionKey } from "../../shared/PubSubKeys"
import { RecordPointer, RecordTable, RecordValue } from "../../shared/schema"
import { loadRecord } from "../loaders/loadRecord"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { useRerender } from "./useRerender"

export function useRecord<T extends RecordTable>(pointer: RecordPointer<T>) {
	const environment = useClientEnvironment()

	const { subscriptionCache, recordCache } = environment

	// Load from storage / api.
	const loader = loadRecord(environment, pointer as RecordPointer)
	if (!loader.resolved) throw loader.promise

	// Subscribe to updates.
	useEffect(
		() =>
			subscriptionCache.subscribe(
				toSubscriptionKey({ type: "getRecord", pointer: pointer as RecordPointer })
			),
		[]
	)

	// Query from the in-memory cache.
	const subscribe = useCallback(
		(update: () => void) => {
			return recordCache.subscribeRecord(pointer, update)
		},
		[pointer.table, pointer.id]
	)

	const getSnapshot = useCallback(() => {
		return recordCache.getRecord(pointer)
	}, [pointer.table, pointer.id])

	const record = useSyncExternalStore(subscribe, getSnapshot)

	return record
}

export function useRecords<T extends RecordPointer[]>(
	pointers: T
): { [K in keyof T]: RecordValue<T[K]["table"]> } {
	const environment = useClientEnvironment()

	const { subscriptionCache, recordCache } = environment

	// Load from storage / api and suspend if loading.
	const loaders = pointers.map((pointer) => loadRecord(environment, pointer))
	const unresolved = loaders.filter((loader) => !loader.resolved)
	if (unresolved.length > 0) {
		throw Promise.all(unresolved.map((loader) => loader.promise))
	}

	const update = useRerender()

	const stablePointers = useStableRef(pointers)

	useListEffect(pointers, (pointer) => {
		const unsubscribes = [
			subscriptionCache.subscribe(toSubscriptionKey({ type: "getRecord", pointer })),
			recordCache.subscribeRecord(pointer, update),
		]
		return () => unsubscribes.forEach((fn) => fn())
	})

	// Query from the in-memory cache.
	const records = useMemo(() => {
		return pointers.map((pointer) => recordCache.getRecord(pointer))
	}, [stablePointers])

	return records as any
}

function useStableRef<T>(value: T) {
	const prevValueRef = useRef(value)
	const stableValue = isEqual(prevValueRef.current, value) ? prevValueRef.current : value
	prevValueRef.current = value
	return stableValue
}

/**
 * We expect `items` to be a stable reference. Compose with `useStableRef` if necessary.
 */
function useListEffect<T>(items: T[], effect: (item: T) => () => void) {
	const prevItemsRef = useRef<T[]>([])

	const unsubscribes = useRef(new DeepMap<T, () => void>())

	useEffect(() => {
		const addedItems = differenceWith(items, prevItemsRef.current, isEqual)
		const removedItems = differenceWith(prevItemsRef.current, items, isEqual)

		for (const item of addedItems) {
			unsubscribes.current.set(item, effect(item))
		}

		for (const item of removedItems) {
			const unsubscribe = unsubscribes.current.get(item)
			if (!unsubscribe) throw new Error("This should have been subscribed to...")
			unsubscribe()
			unsubscribes.current.delete(item)
		}
	}, [items])
	useEffect(() => {
		return () => {
			for (const item of items) {
				const unsubscribe = unsubscribes.current.get(item)
				if (!unsubscribe) throw new Error("This should have been subscribed to...")
				unsubscribe()
				unsubscribes.current.delete(item)
			}
		}
	}, [])

	useEffect(() => {
		prevItemsRef.current = items
	})
}

class DeepMap<K, V> {
	private internalMap: Map<string, V>

	constructor() {
		this.internalMap = new Map<string, V>()
	}

	private getObjectKey(o: K): string {
		return JSON.stringify(o)
	}

	set(key: K, value: V): void {
		const strKey = this.getObjectKey(key)
		this.internalMap.set(strKey, value)
	}

	get(key: K): V | undefined {
		const strKey = this.getObjectKey(key)
		return this.internalMap.get(strKey)
	}

	has(key: K): boolean {
		const strKey = this.getObjectKey(key)
		return this.internalMap.has(strKey)
	}

	delete(key: K): boolean {
		const strKey = this.getObjectKey(key)
		return this.internalMap.delete(strKey)
	}

	clear(): void {
		this.internalMap.clear()
	}
}
