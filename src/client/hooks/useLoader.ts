import { useEffect, useMemo } from "react"
import { LoaderPromise } from "../../shared/LoaderPromise"

type Loaders = { [key: string]: { refs: number; loader: LoaderPromise } }

const loaders: Loaders = {}

type JSONValue = string | number | boolean | null | JSONValue[]
// | { [key: string | number]: JSONValue }

/** `id` must uniquly identify the loader. */
export function useLoader<T>(id: JSONValue, fn: () => Promise<T>): LoaderPromise<T> {
	const key = JSON.stringify(id)

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
