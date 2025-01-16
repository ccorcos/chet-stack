import { orderedArray } from "@ccorcos/ordered-array"
import { identity } from "lodash"
import { useEffect, useMemo, useRef } from "react"
import { compare } from "../../shared/compare"
import { keyToRange, LocalGetResult, LocalListResult } from "../../shared/database/Cache"
import { compareRange, overlaps, Range } from "../../shared/database/Range"
import { ListArgs, WriteArgs } from "../../shared/database/types"
import { randomId } from "../../shared/randomId"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { useCounter } from "./useCounter"
import { useDeepMemo } from "./useDeepMemo"
import { useLoader } from "./useLoader"

// Maybe we should get rid api.get() and just use list for everything.
export function useGet(key: string) {
	// const { api, cache } = useClientEnvironment()

	// const [_, rerender] = useCounter()
	// const localResultRef = useRef<LocalGetResult>({} as any)

	// useMemo(() => {
	// 	localResultRef.current = cache.get(key)
	// }, [key])

	// useEffect(() => {
	// 	return cache.subscribe({ gte: key, lte: key }, () => {
	// 		localResultRef.current = cache.get(key)
	// 		rerender()
	// 	})
	// }, [key])

	// const remoteResult = useLoader("get:" + key, async () => {
	// 	const response = await api.get(key)
	// 	if (response.status !== 200) throw new Error("Request failed: " + response.status)

	// 	if (response.body === undefined) cache.insert({ gte: key, lte: key }, [])
	// 	else cache.insert({ gte: key, lte: key }, [{ key, value: response.body }])
	// })

	// const localResult = localResultRef.current
	// return { localResult, remoteResult }

	const { localResult, remoteResult } = useList({ gte: key, lte: key })
	const localGetResult: LocalGetResult = localResult.miss
		? { miss: true }
		: { hit: localResult.hit?.[0]?.value }
	return { localResult: localGetResult, remoteResult }
}

export function useList(_args: ListArgs<string>) {
	const { api, cache } = useClientEnvironment()

	const args = useDeepMemo(() => _args, [_args])

	const [_, rerender] = useCounter()
	const localResultRef = useRef<LocalListResult>({} as any)

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

	const remoteResult = useLoader("list:" + JSON.stringify(args) + fetchCount, async () => {
		// TODO: this doesn't seem to be necessary.
		await pendingWritesSubmitted(args)
		const response = await api.list(args)
		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		cache.insert(args, response.body)
	})

	const localResult = localResultRef.current
	return { localResult, remoteResult }
}

type PendingWrite = { range: Range; id: string; promise: Promise<any> }
const pendingWrites: PendingWrite[] = []
const sortedWrites = orderedArray<PendingWrite>(identity, (a: PendingWrite, b: PendingWrite) => {
	const dir = compareRange(a.range, b.range)
	if (dir !== 0) return dir
	return compare(a.id, b.id)
})

function trackPendingWrite(args: WriteArgs<string, string>, promise: Promise<any>) {
	const keys = new Set<string>()
	for (const { key } of args.set ?? []) keys.add(key)
	for (const key of args.delete ?? []) keys.add(key)
	const ranges = Array.from(keys).map(keyToRange)

	for (const range of ranges) {
		const pendingWrite: PendingWrite = { range, id: randomId(), promise }
		pendingWrite.promise = promise.then(() => sortedWrites.remove(pendingWrites, pendingWrite))
		sortedWrites.insert(pendingWrites, pendingWrite)
	}
}

async function pendingWritesSubmitted(args: Range) {
	const waitFor = () => {
		// We can be greedy here because we will call this again once the promise is resolved waiting
		// for all pending writes to be cleared.
		for (const pendingWrite of pendingWrites) {
			if (overlaps(pendingWrite.range, args)) {
				return pendingWrite.promise
			}
		}
	}

	let promise = waitFor()
	while (promise !== undefined) {
		await promise
		promise = waitFor()
	}
}

export function useWrite() {
	const { api, cache } = useClientEnvironment()

	return async (args: WriteArgs<string, string>) => {
		cache.write(args)
		const promise = api.write(args)

		// Track pending writes.
		trackPendingWrite(args, promise)

		return await promise
	}
}
