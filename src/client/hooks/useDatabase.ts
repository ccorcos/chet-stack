import { orderedArray } from "@ccorcos/ordered-array"
import { identity } from "lodash"
import { useEffect, useMemo, useRef } from "react"
import { compare } from "../../shared/compare"
import { keyToRange, LocalGetResult, LocalListResult } from "../../shared/database/Cache"
import { compareRange, overlapsRange, Range } from "../../shared/database/Range"
import { ListArgs, WriteArgs } from "../../shared/database/types"
import { randomId } from "../../shared/randomId"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { useCounter } from "./useCounter"
import { useDeepMemo } from "./useDeepMemo"
import { useLoader } from "./useLoader"

export function useGet(key: string) {
	const { localResult, remoteResult } = useList({ gte: key, lte: key })
	const localGetResult: LocalGetResult<string> = localResult.miss
		? { miss: true }
		: { hit: localResult.hit?.[0]?.value }
	return { localResult: localGetResult, remoteResult }
}

export function useGetJSON(key: string) {
	const { localResult, remoteResult } = useGet(key)

	const jsonLocalResult: LocalGetResult<any> = useMemo(() => {
		if (localResult.miss) return { miss: true }
		if (localResult.hit === undefined) return { hit: undefined }
		return { hit: JSON.parse(localResult.hit) }
	}, [localResult])

	return { localResult: jsonLocalResult, remoteResult }
}

export function useList(_args: ListArgs<string>) {
	const { api, cache } = useClientEnvironment()

	const args = useDeepMemo(() => _args, [_args])

	const [_, rerender] = useCounter()
	const localResultRef = useRef<LocalListResult<string, string>>({} as any)

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
		const response = await api.rawList(args)
		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		cache.insert(args, response.body)
		// return response.body
	})

	const localResult = localResultRef.current
	return { localResult, remoteResult }
}

export function useListJSON(args: ListArgs<string>) {
	const { localResult, remoteResult } = useList(args)

	const jsonLocalResult: LocalListResult<string, any> = useMemo(() => {
		if (localResult.hit) {
			return { hit: localResult.hit.map(({ key, value }) => ({ key, value: JSON.parse(value) })) }
		}
		if (localResult.prefix) {
			return {
				prefix: localResult.prefix.map(({ key, value }) => ({ key, value: JSON.parse(value) })),
			}
		}
		return { miss: true }
	}, [localResult])

	return { localResult: jsonLocalResult, remoteResult }
}

type PendingWrite = { range: Range<string>; id: string; promise: Promise<any> }
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

async function pendingWritesSubmitted(args: Range<string>) {
	const waitFor = () => {
		// We can be greedy here because we will call this again once the promise is resolved waiting
		// for all pending writes to be cleared.
		for (const pendingWrite of pendingWrites) {
			if (overlapsRange(pendingWrite.range, args)) {
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
		const promise = api.rawWrite(args)

		// Track pending writes.
		trackPendingWrite(args, promise)

		return await promise
	}
}

export function useWriteJSON() {
	const write = useWrite()

	return async (args: WriteArgs<string, any>) => {
		write({
			...args,
			set: args.set?.map(({ key, value }) => ({ key, value: JSON.stringify(value) })),
		})
	}
}
