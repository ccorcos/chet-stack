import { useEffect, useMemo } from "react"
import { LoaderPromise } from "../../shared/LoaderPromise"
import { WriteArgs } from "../../shared/database/types"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { ClientApi } from "../services/api"
import { useCounter } from "./useCounter"

type Loaders = { [key: string]: { refs: number; loader: LoaderPromise } }

const loaders: Loaders = {}

function useLoader<T>(key: string, fn: () => Promise<T>): LoaderPromise<T> {
	const loader = useMemo(() => {
		if (loaders[key]) {
			const loader = loaders[key]
			loader.refs += 1
			return loader.loader
		}
		// console.log("load", id)
		const loader = new LoaderPromise(fn())
		loaders[key] = { refs: 1, loader }
		return loader
	}, [key])

	useEffect(
		() => () => {
			if (loaders[key]) {
				const loader = loaders[key]
				loader.refs -= 1
				if (loader.refs === 0) delete loaders[key]
			}
		},
		[key]
	)

	return loader as LoaderPromise<T>
}

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

function suspendLoader<T>(loader: LoaderPromise<T>) {
	if (loader.rejected) throw loader.error!
	if (loader.resolved) return loader.value as T
	throw loader.promise
}

type Cache = { [key: string]: string }

const cache: Cache = {}

type Listeners = { [key: string]: Set<(value: string) => void> }

const listeners: Listeners = {}

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
	for (const listener of listeners[key] ?? []) listener(value)
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

	suspendLoader(loader)

	const value = useCache(key)
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
