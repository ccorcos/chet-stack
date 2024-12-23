// We're going to do everything in here.
// useKeyValue
// useOKV
// useOKVList
// useLoader

/*

At a high level...
- useLoader is just for the async requests. There's no optimmistic updates here so lets not save them around.
- the result goes into the cache
- we need to keep track of what ranges we've put into the cache.
- we can subscribe to the cache and when refs goes to zero, we delay evict.
-

*/

import { useEffect, useMemo, useRef } from "react"
import { LoaderPromise } from "../../shared/LoaderPromise"
import { InMemoryIntervalTree } from "../../shared/database/InMemoryIntervalTree"
import { ListArgs } from "../../shared/database/types"
import { randomId } from "../../shared/randomId"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { useCounter } from "./useCounter"
import { useDeepMemo } from "./useDeepMemo"

// ==============================
// STATE
// ==============================

type Loaders = { [key: string]: { refs: number; loader: LoaderPromise } }
const loaders: Loaders = {}

const cachedRanges = new InMemoryIntervalTree<[string, string, string], undefined>()

// ==============================
// useLoader
// ==============================

const debug = (...args: any[]) => {
	// console.log(...args)
}

/** `id` must uniquly identify the loader. */
function useLoader<T>(key: string, fn: () => Promise<T> | T): LoaderPromise<T> {
	let loader = loaders[key]
	if (!loader) {
		debug("MISS", key)
		loader = { refs: 0, loader: new LoaderPromise(fn()) }
		loaders[key] = loader
	} else {
		debug("HIT", key)
	}

	// NOTE: we're mutating the loader object inside the database.
	// Increment ref count once per component instance
	useEffect(() => {
		debug("INC", key)
		loader.refs += 1
		return () => {
			loader.refs -= 1
			debug("DEC", key)
			if (loader.refs === 0) {
				debug("CLEAR", key)
				delete loaders[key]
			}
		}
	}, [key])

	return loader.loader as LoaderPromise<T>
}

// ==============================
// useKey
// ==============================

export function useGet(key: string) {
	const { api, db: cache } = useClientEnvironment()

	const requestId = useMemo(() => randomId(), [key])

	const loader = useLoader("get:" + key, () => {
		const ranges = cachedRanges.intersects(key)
		if (ranges.length > 0) return debug("CACHED", key)

		return (async () => {
			debug("FETCH", key)
			const response = await api.get(key)
			if (response.status !== 200) throw new Error("Request failed: " + response.status)
			if (response.body === undefined) cache.delete(key)
			else cache.set(key, response.body)
			cachedRanges.set([key, key, key], undefined)
		})()
	})

	loader.suspend()

	const valueRef = useRef<any>()

	useMemo(() => {
		valueRef.current = cache.get(key)
	}, [requestId])

	const [_, rerender] = useCounter()
	const update = () => {
		valueRef.current = cache.get(key)
		rerender()
	}

	useEffect(() => {
		return cache.subscribe({ gte: key, lte: key }, update)
	}, [requestId])

	return valueRef.current as string
}

export function useList(args: ListArgs<string>) {
	const { api, db: cache } = useClientEnvironment()

	const requestId = useDeepMemo(() => randomId(), [args])

	const loader = useLoader("list:" + JSON.stringify(args), () => {
		const covered = cachedRanges.covers(args)
		if (covered) return debug("CACHED", args)

		return (async () => {
			debug("FETCH", args)
			const response = await api.list(args)
			if (response.status !== 200) throw new Error("Request failed: " + response.status)
			cache.write({ set: response.body })

			const start = args.gte || args.gt || ""
			const end = args.lte || args.lt || "\xff"

			const requestId = randomId()
			cachedRanges.set([start, end, requestId], undefined)
		})()
	})

	loader.suspend()

	const valueRef = useRef<any>()

	useMemo(() => {
		valueRef.current = cache.list(args)
	}, [requestId])

	const [_, rerender] = useCounter()
	const update = () => {
		valueRef.current = cache.list(args)
		rerender()
	}

	useEffect(() => {
		return cache.subscribe(args, update)
	}, [requestId])

	return valueRef.current as { key: string; value: string }[]
}
