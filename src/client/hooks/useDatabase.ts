import { useEffect, useMemo, useRef } from "react"
import {
	LocalGetResult,
	LocalListResult,
	insertCache,
	localGet,
	localList,
	localSubscribe,
	localWrite,
} from "../../shared/database/Cache"
import { ListArgs, WriteArgs } from "../../shared/database/types"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { useCounter } from "./useCounter"
import { useDeepMemo } from "./useDeepMemo"
import { useLoader } from "./useLoader"

// Maybe we should get rid api.get() and just use list for everything.
export function useGet(key: string) {
	const { api } = useClientEnvironment()

	const [_, rerender] = useCounter()
	const localResultRef = useRef<LocalGetResult>({} as any)

	useMemo(() => {
		localResultRef.current = localGet(key)
	}, [key])

	useEffect(() => {
		return localSubscribe({ gte: key, lte: key }, () => {
			localResultRef.current = localGet(key)
			rerender()
		})
	}, [key])

	const remoteResult = useLoader("get:" + key, async () => {
		const response = await api.get(key)
		if (response.status !== 200) throw new Error("Request failed: " + response.status)

		if (response.body === undefined) insertCache({ gte: key, lte: key }, [])
		else insertCache({ gte: key, lte: key }, [{ key, value: response.body }])
	})

	const localResult = localResultRef.current
	if (localResult.miss) remoteResult.suspend()

	return localResultRef.current.hit
}

export function useList(_args: ListArgs<string>) {
	const { api } = useClientEnvironment()

	const args = useDeepMemo(() => _args, [_args])

	const [_, rerender] = useCounter()
	const localResultRef = useRef<LocalListResult>({} as any)

	useMemo(() => {
		console.log("New Query", args)
		localResultRef.current = localList(args)
	}, [args])

	useEffect(() => {
		return localSubscribe(args, () => {
			console.log("Update", args)
			localResultRef.current = localList(args)
			rerender()
		})
	}, [args])

	const remoteResult = useLoader("list:" + JSON.stringify(args), async () => {
		const response = await api.list(args)
		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		insertCache(args, response.body)
	})

	const localResult = localResultRef.current
	if (localResult.miss) remoteResult.suspend()

	return {
		list: localResultRef.current.hit || localResultRef.current.prefix!,
		loadingMore: Boolean(localResultRef.current.prefix),
	}
}

export function useWrite() {
	const { api } = useClientEnvironment()

	return async (args: WriteArgs<string, string>) => {
		localWrite(args)
		await api.write(args)
	}
}
