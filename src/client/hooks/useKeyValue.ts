import { useEffect } from "react"
import { WriteArgs } from "../../shared/database/types"
import { incStr } from "../../shared/incStr"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { ClientApi } from "../services/api"
import { useCounter } from "./useCounter"
import { useLoader } from "./useLoader"

// function useLoaderResult<T>(loader: LoaderPromise<T>) {
// 	const [_, rerender] = useCounter()
// 	useEffect(() => {
// 		// No need if we subscribe to the cache.
// 		loader.promise.then(rerender)
// 	}, [loader])
// 	if (loader.rejected) return { loading: false, error: loader.error! }
// 	if (loader.resolved) return { loading: false, error: undefined, value: loader.value as T }
// 	return { loading: true }
// }

type Cache = { [key: string]: string }

const cache: Cache = {}

type Listeners = { [key: string]: Set<(value: string) => void> }

const listeners: Listeners = {}

function getEmit(keys: string[]) {
	const fns = new Set<(value: string) => void>()
	for (const key of keys) {
		for (const listener of listeners[key] ?? []) fns.add(listener)
		for (const [prefix, listenersSet] of Object.entries(listenRanges)) {
			if (key.startsWith(prefix)) {
				for (const listener of listenersSet) {
					fns.add(listener)
				}
			}
		}
	}
	return fns
}

function emitListeners(key: string, value: string) {
	for (const listener of listeners[key] ?? []) listener(value)
}

function emitListenRanges(key: string, value: string) {
	// TODO: use a prefix tree or an interval tree to make this faster.
	for (const [prefix, listenersSet] of Object.entries(listenRanges)) {
		if (key.startsWith(prefix)) {
			for (const listener of listenersSet) listener(value)
		}
	}
}

const listenRanges: Listeners = {}

function useCache(key: string) {
	const [_, rerender] = useCounter()

	// Subscribe to local updates.
	useEffect(() => {
		const listener = () => rerender()
		if (listeners[key]) {
			listeners[key].add(listener)
		} else {
			listeners[key] = new Set([listener])
		}
		return () => {
			if (listeners[key]) {
				listeners[key].delete(listener)
				if (listeners[key].size === 0) delete listeners[key]
			}
		}
	}, [key])

	return cache[key] as string | undefined
}

function setCache(key: string, value: any) {
	if (value === undefined) delete cache[key]
	else cache[key] = value
	emitListeners(key, value)
	emitListenRanges(key, value)
}

function setCacheList(args: { key: string; value: any }[]) {
	for (const { key, value } of args) {
		if (value === undefined) delete cache[key]
		else cache[key] = value
	}
	const fns = getEmit(args.map(({ key }) => key))
	// TODO: need to re-fetch the values here.
	for (const fn of fns) fn(undefined as any)
}

function useCacheList(prefix: string) {
	const [_, rerender] = useCounter()

	// Subscribe to local updates.
	useEffect(() => {
		const listener = () => rerender()
		if (listenRanges[prefix]) {
			listenRanges[prefix].add(listener)
		} else {
			listenRanges[prefix] = new Set([listener])
		}
		return () => {
			if (listenRanges[prefix]) {
				listenRanges[prefix].delete(listener)
				if (listenRanges[prefix].size === 0) delete listenRanges[prefix]
			}
		}
	}, [prefix])

	// TODO: use a prefix tree or an interval tree to make this faster.
	return Object.entries(cache)
		.filter(([key, value]) => key.startsWith(prefix))
		.map(([key, value]) => ({ key, value }))
}

// TODO: move cache, listeners, and loaders to the client environment.
export function useKeyValue<T>(key: string): string {
	const { api } = useClientEnvironment()

	const loader = useLoader("get:" + key, async () => {
		const response = await api.get(key)
		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		// db.set(key, response.body)
		setCache(key, response.body)
	})

	loader.suspend()

	const value = useCache(key)
	// TODO: subscribe to remote updates

	return value! // because of suspense
}

export function useList<T>(prefix: string): { key: string; value: string }[] {
	const { api } = useClientEnvironment()

	const loader = useLoader("list:" + prefix, async () => {
		const response = await api.list({ gte: prefix, lt: incStr(prefix) })
		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		// db.set(key, response.body)
		setCacheList(response.body)
	})

	loader.suspend()

	const value = useCacheList(prefix)
	// TODO: subscribe to remote updates

	return value! // because of suspense
}

export async function writeKeyValue(api: ClientApi, args: WriteArgs<string, string>) {
	for (const { key, value } of args.set ?? []) setCache(key, value)
	for (const key of args.delete ?? []) setCache(key, undefined)
	return await api.write(args)
}

// Loader needs to encapsulate...
// - the api request
// - the local database optimistic write
// - eventually pub sub updates
