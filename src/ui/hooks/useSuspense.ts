import { useEffect, useMemo } from "react"
import { LoaderPromise } from "shared/LoaderPromise"

const requests: { [key: string]: LoaderPromise<any> } = {}

export function useSuspense<T>(id: string, fn: () => Promise<T>) {
	const loader = useMemo(() => {
		if (requests[id]) return requests[id] as LoaderPromise<T>
		// console.log("load", id)
		const loader = new LoaderPromise(fn())
		requests[id] = loader
		return loader
	}, [id])

	useEffect(
		() => () => {
			// console.log("unload", id)
			delete requests[id]
		},
		[id]
	)

	if (loader.rejected) throw loader.error!
	if (loader.resolved) return loader.value as T
	throw loader.promise
}
