import type { ApiTypes } from "../shared/ApiTypes"
import { httpRequest } from "./httpRequest"
import type { RecordCacheApi } from "./RecordCache"

type ApiResponse<Body> = { status: 200; body: Body } | { status: number; body?: any }

export async function apiRequest<T extends keyof ApiTypes>(
	environment: { cache: RecordCacheApi },
	name: T,
	args: ApiTypes[T]["input"]
): Promise<ApiResponse<Awaited<ApiTypes[T]["output"]>>> {
	const result = await httpRequest("/api/" + name, args)

	// Update the local cache with any records returned from the server.
	// By convention, any API request can return a recordMap.
	if (result.status === 200) {
		if (result.body?.recordMap) {
			environment.cache.updateRecordMap(result.body.recordMap)
		}
	}

	return result
}

export type ClientApi = {
	[ApiName in keyof ApiTypes]: (
		args: ApiTypes[ApiName]["input"]
	) => Promise<ApiResponse<Awaited<ApiTypes[ApiName]["output"]>>>
}

export function createClientApi(environment: { cache: RecordCacheApi }) {
	return new Proxy(
		{},
		{
			get(target, key: any, reciever) {
				return (args: any) => apiRequest(environment, key, args)
			},
		}
	) as ClientApi
}
