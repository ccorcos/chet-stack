import { useEffect, useMemo, useRef } from "react"
import { LocalGetResult, LocalListResult } from "../../shared/database/Cache"
import { ListArgs, WriteArgs } from "../../shared/database/types"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { useCounter } from "./useCounter"
import { useDeepMemo } from "./useDeepMemo"
import { useLoader } from "./useLoader"

// Maybe we should get rid api.get() and just use list for everything.
export function useGet(key: string) {
	const { api, cache } = useClientEnvironment()

	const [_, rerender] = useCounter()
	const localResultRef = useRef<LocalGetResult>({} as any)

	useMemo(() => {
		localResultRef.current = cache.localGet(key)
	}, [key])

	useEffect(() => {
		return cache.localSubscribe({ gte: key, lte: key }, () => {
			localResultRef.current = cache.localGet(key)
			rerender()
		})
	}, [key])

	const remoteResult = useLoader("get:" + key, async () => {
		const response = await api.get(key)
		if (response.status !== 200) throw new Error("Request failed: " + response.status)

		if (response.body === undefined) cache.insertCache({ gte: key, lte: key }, [])
		else cache.insertCache({ gte: key, lte: key }, [{ key, value: response.body }])
	})

	const localResult = localResultRef.current
	return { localResult, remoteResult }
}

export function useList(_args: ListArgs<string>) {
	const { api, cache } = useClientEnvironment()

	const args = useDeepMemo(() => _args, [_args])

	const [_, rerender] = useCounter()
	const localResultRef = useRef<LocalListResult>({} as any)

	useMemo(() => {
		localResultRef.current = cache.localList(args)
	}, [args])

	const [fetchCount, refetch] = useCounter()
	useEffect(() => {
		const unsub = cache.localSubscribe(args, () => {
			localResultRef.current = cache.localList(args)
			rerender()
			// If a use deletes a record leaving an incomplete list, then we need to refetch.
			if (!localResultRef.current.hit) refetch()
		})
		return () => {
			unsub()
		}
	}, [args])

	const remoteResult = useLoader("list:" + JSON.stringify(args) + fetchCount, async () => {
		const response = await api.list(args)
		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		cache.insertCache(args, response.body)
	})

	const localResult = localResultRef.current
	return { localResult, remoteResult }
}

export function useWrite() {
	const { api, cache } = useClientEnvironment()

	return async (args: WriteArgs<string, string>) => {
		cache.localWrite(args)
		await api.write(args)
	}
}
