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
			localResultRef.current = cache.list(args)
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

// type PendingWrite = { range: Range<string>; id: string; promise: Promise<any> }
// const pendingWrites: PendingWrite[] = []
// const sortedWrites = orderedArray<PendingWrite>(identity, (a: PendingWrite, b: PendingWrite) => {
// 	const dir = compareRange(a.range, b.range)
// 	if (dir !== 0) return dir
// 	return compare(a.id, b.id)
// })

// function trackPendingWrite(args: WriteArgs<string, string>, promise: Promise<any>) {
// 	const keys = new Set<string>()
// 	for (const { key } of args.set ?? []) keys.add(key)
// 	for (const key of args.delete ?? []) keys.add(key)
// 	const ranges = Array.from(keys).map(keyToRange)

// 	for (const range of ranges) {
// 		const pendingWrite: PendingWrite = { range, id: randomId(), promise }
// 		pendingWrite.promise = promise.then(() => sortedWrites.remove(pendingWrites, pendingWrite))
// 		sortedWrites.insert(pendingWrites, pendingWrite)
// 	}
// }

// async function pendingWritesSubmitted(args: Range<string>) {
// 	const waitFor = () => {
// 		// We can be greedy here because we will call this again once the promise is resolved waiting
// 		// for all pending writes to be cleared.
// 		for (const pendingWrite of pendingWrites) {
// 			if (overlapsRange(pendingWrite.range, args)) {
// 				return pendingWrite.promise
// 			}
// 		}
// 	}

// 	let promise = waitFor()
// 	while (promise !== undefined) {
// 		await promise
// 		promise = waitFor()
// 	}
// }

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
