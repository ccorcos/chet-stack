import React, { useMemo } from "react"
import {
	EncodeSubspaceListArgs,
	KeyDecodeCacheListResult,
	KeyDecodeList,
	KeyEncodeList,
	KeyEncodeRange,
	KeyEncodeWrite,
	TupleSubspaceEncoder,
} from "../../shared/database/Encoder"
import { BaseOKVCache, JSONValue, Tuple } from "../../shared/database/types"
import { proxyObj } from "../../shared/proxyHelpers"
import { ClientEnvironmentProvider, useClientEnvironment } from "../services/ClientEnvironment"
import { ClientApi } from "../services/api"

function ApiSubspace(api: ClientApi, prefix: Tuple): ClientApi {
	const encoder = TupleSubspaceEncoder(prefix)

	return proxyObj(async (key, ...args) => {
		if (key === "list") {
			const newArgs = EncodeSubspaceListArgs(args[0], prefix)
			const response = await api.list(newArgs)
			if (response.status === 200) {
				return {
					...response,
					body: KeyDecodeList(response.body, encoder),
				}
			}
			return response
		}
		if (key === "write") {
			return api.write(KeyEncodeWrite(args[0], encoder))
		}
		return api[key](...args)
	})
}

function CacheSubspace(
	cache: BaseOKVCache<Tuple, JSONValue>,
	prefix: Tuple
): BaseOKVCache<Tuple, JSONValue> {
	const encoder = TupleSubspaceEncoder(prefix)
	return {
		compare: cache.compare,
		list(args = {}) {
			const newArgs = EncodeSubspaceListArgs(args, prefix)
			const result = cache.list(newArgs)
			return KeyDecodeList(result, encoder)
		},
		listCached(args) {
			const newArgs = EncodeSubspaceListArgs(args, prefix)
			const results = cache.listCached(newArgs)
			return KeyDecodeCacheListResult(results, encoder)
		},
		write(args) {
			const newArgs = KeyEncodeWrite(args, encoder)
			return cache.write(newArgs)
		},
		finalize(args) {
			const newArgs = KeyEncodeWrite(args, encoder)
			return cache.finalize(newArgs)
		},
		insert(args, result) {
			const newArgs = EncodeSubspaceListArgs(args, prefix)
			const newResult = KeyEncodeList(result, encoder)
			return cache.insert(newArgs, newResult)
		},
		subscribe(range, fn) {
			return cache.subscribe(KeyEncodeRange(range, encoder), fn)
		},
	}
}

export function Subspace(props: { prefix: Tuple; children: React.ReactNode }) {
	const environment = useClientEnvironment()
	const { api, cache } = environment

	const newEnvironment = useMemo(() => {
		const newApi = ApiSubspace(api, props.prefix)
		const newCache = CacheSubspace(cache, props.prefix)
		return { ...environment, api: newApi, cache: newCache }
	}, [props.prefix])

	return (
		<ClientEnvironmentProvider value={newEnvironment}>{props.children}</ClientEnvironmentProvider>
	)
}
