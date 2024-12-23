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

import { useEffect } from "react"
import { LoaderPromise } from "../../shared/LoaderPromise"
import { InMemoryDatabase } from "../../shared/database/InMemoryDatabase"
import { InMemoryIntervalTree } from "../../shared/database/InMemoryIntervalTree"
import { ListArgs } from "../../shared/database/types"
import { randomId } from "../../shared/randomId"
import { useClientEnvironment } from "../services/ClientEnvironment"

// ==============================
// STATE
// ==============================

type Loaders = { [key: string]: { refs: number; loader: LoaderPromise } }
const loaders: Loaders = {}

const cache = new InMemoryDatabase<string, string>()
const cachedRanges = new InMemoryIntervalTree<[string, string, string], undefined>()
const listeners = new InMemoryIntervalTree<[string, string, string], () => void>()

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
	const { api } = useClientEnvironment()

	const loader = useLoader("get:" + key, () => {
		const ranges = cachedRanges.intersects(key)
		if (ranges.length > 0) {
			debug("CACHED", key)
			const cached = cache.get(key)
			return cached
		}

		return (async () => {
			debug("FETCH", key)
			const response = await api.get(key)
			if (response.status !== 200) throw new Error("Request failed: " + response.status)
			if (response.body === undefined) cache.delete(key)
			else cache.set(key, response.body)
			cachedRanges.set([key, key, key], undefined)
			return response.body
		})()
	})

	const value = loader.suspend()
	return value
}

export function useList(args: ListArgs<string>) {
	const { api } = useClientEnvironment()

	const loader = useLoader("list:" + JSON.stringify(args), () => {
		const covered = cachedRanges.covers(args)
		if (covered) {
			debug("CACHED", args)
			const result = cache.list(args)
			return result
		}

		return (async () => {
			debug("FETCH", args)
			const response = await api.list(args)
			if (response.status !== 200) throw new Error("Request failed: " + response.status)
			cache.write({ set: response.body })

			const start = args.gte || args.gt || ""
			const end = args.lte || args.lt || "\xff"

			const requestId = randomId()
			cachedRanges.set([start, end, requestId], undefined)
			return response.body
		})()
	})

	const value = loader.suspend()
	return value
}
