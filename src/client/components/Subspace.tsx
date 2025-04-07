import React, { useMemo } from "react"
import { compare } from "../../shared/compare"
import { Cache } from "../../shared/database/Cache"
import {
	KeyDecodeList,
	KeyEncodeList,
	KeyEncodeListArgs,
	KeyEncoder,
	KeyEncodeWrite,
} from "../../shared/database/Encoder"
import { proxyObj } from "../../shared/proxyHelpers"
import { ClientEnvironmentProvider, useClientEnvironment } from "../services/ClientEnvironment"

export function Subspace(props: { prefix: string; children: React.ReactNode }) {
	const environment = useClientEnvironment()

	const { api } = environment

	const newEnvironment = useMemo(() => {
		const encoder: KeyEncoder<string, string> = {
			compare: compare,
			encode: (key) => props.prefix + key,
			decode: (key) => key.slice(props.prefix.length),
		}

		const newApi = proxyObj(async (key, args) => {
			if (key === "rawList") {
				const response = await api.rawList(KeyEncodeListArgs(args, encoder))
				if (response.status === 200) {
					return {
						...response,
						body: KeyDecodeList(response.body, encoder),
					}
				}

				return response
			}
			if (key === "rawWrite") {
				return api.rawWrite(KeyEncodeWrite(args, encoder))
			}

			return api[key](args)
		})

		const cache = environment.cache
		const newCache: Cache = Object.create(cache)
		newCache.insert = (args, result) => {
			cache.insert(KeyEncodeListArgs(args, encoder), KeyEncodeList(result, encoder))
		}
		newCache.list = (args) => {
			const result = cache.list(KeyEncodeListArgs(args, encoder))
			if (result.hit) result.hit = KeyDecodeList(result.hit, encoder)
			if (result.prefix) result.prefix = KeyDecodeList(result.prefix, encoder)
			return result
		}
		newCache.get = (key) => {
			return cache.get(encoder.encode(key))
		}
		newCache.subscribe = (range, fn) => {
			return cache.subscribe(KeyEncodeListArgs(range, encoder), fn)
		}
		newCache.write = (args) => {
			return cache.write(KeyEncodeWrite(args, encoder))
		}

		return { ...environment, api: newApi, cache: newCache }
	}, [props.prefix])

	return (
		<ClientEnvironmentProvider value={newEnvironment}>{props.children}</ClientEnvironmentProvider>
	)
}
