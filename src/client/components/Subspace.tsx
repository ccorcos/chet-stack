import React, { useMemo } from "react"
import {
	Encoder,
	KeyDecodeList,
	KeyEncodeListArgs,
	KeyEncodeOKVCache,
	KeyEncodeWrite,
} from "../../shared/database/Encoder"
import { BaseOKVCache, JSONValue, Tuple } from "../../shared/database/types"
import { proxyObj } from "../../shared/proxyHelpers"
import { ClientEnvironmentProvider, useClientEnvironment } from "../services/ClientEnvironment"
import { ClientApi } from "../services/api"

function TupleSubspaceEncoder(prefix: Tuple): Encoder<Tuple, Tuple> {
	return {
		encode: (key) => [...prefix, ...key],
		decode: (key) => key.slice(prefix.length),
	}
}

function ApiSubspace(api: ClientApi, prefix: Tuple): ClientApi {
	const encoder = TupleSubspaceEncoder(prefix)

	return proxyObj(async (key, ...args) => {
		if (key === "list") {
			const response = await api.list(KeyEncodeListArgs(args[0], encoder))
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

function CacheSubspace(cache: BaseOKVCache<Tuple, JSONValue>, prefix: Tuple) {
	const encoder = TupleSubspaceEncoder(prefix)
	return KeyEncodeOKVCache(cache, { ...encoder, compare: cache.compare })
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
