import { isEqual } from "lodash-es"
import { useEffect, useMemo, useRef } from "react"
import { CacheListResult, JSONValue, ListArgs, Tuple, WriteArgs } from "../../shared/database/types"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { useCounter } from "./useCounter"
import { useDeepMemo } from "./useDeepMemo"
import { useLoader } from "./useLoader"

export type LocalGetResult<V> = { hit?: V; miss?: true }

export function useGet(key: Tuple) {
	const { localResult, remoteResult } = useList({ gte: key, lte: key })
	const localGetResult: LocalGetResult<JSONValue> = localResult.miss
		? { miss: true }
		: { hit: localResult.hit?.[0]?.value }
	return { localResult: localGetResult, remoteResult }
}

export function useList(_args: ListArgs<Tuple>) {
	const { api, cache } = useClientEnvironment()

	const args = useDeepMemo(() => _args, [_args])

	const [_, rerender] = useCounter()
	const localResultRef = useRef<CacheListResult<Tuple, JSONValue>>({} as any)

	useMemo(() => {
		localResultRef.current = cache.list(args)
	}, [args])

	const [fetchCount, refetch] = useCounter()
	useEffect(() => {
		const unsub = cache.subscribe(args, () => {
			console.log("emitted", args)

			const newResult = cache.list(args)
			if (isEqual(newResult, localResultRef.current)) return
			localResultRef.current = newResult
			rerender()
			// If a use deletes a record leaving an incomplete list, then we need to refetch.
			if (!localResultRef.current.hit) refetch()
		})
		return () => {
			unsub()
		}
	}, [args])

	const requestId = useMemo(() => JSON.stringify([args, fetchCount]), [args, fetchCount])

	const remoteResult = useLoader("list:" + requestId, async () => {
		// TODO: this doesn't seem to be necessary.
		// await pendingWritesSubmitted(args)
		const response = await api.list(args)
		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		cache.insert(args, response.body)
		// return response.body
	})

	const localResult = localResultRef.current
	return { localResult, remoteResult }
}

export function useWrite() {
	const { api, cache } = useClientEnvironment()

	return async (args: WriteArgs<Tuple, JSONValue>) => {
		const cleanup = cache.write(args)
		const promise = api.write(args)

		promise.then(cleanup)

		// Track pending writes.
		// trackPendingWrite(args, promise)

		return await promise
	}
}
