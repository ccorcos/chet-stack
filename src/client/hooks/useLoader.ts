import { useEffect } from "react"
import { LoaderPromise } from "../../shared/LoaderPromise"

type Loaders = { [key: string]: { refs: number; loader: LoaderPromise } }

const loaders: Loaders = {}

type JSONValue = string | number | boolean | null | JSONValue[]
// | { [key: string | number]: JSONValue }

const debug = (...args: any[]) => {
	// console.log(...args)
}

/** `id` must uniquly identify the loader. */
export function useLoader<T>(id: JSONValue, fn: () => Promise<T>): LoaderPromise<T> {
	const key = JSON.stringify(id)

	let loader = loaders[key]
	if (!loader) {
		debug("MISS", key)
		loader = { refs: 0, loader: new LoaderPromise(fn()) }
		loaders[key] = loader
	} else {
		debug("HIT", key)
	}

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
