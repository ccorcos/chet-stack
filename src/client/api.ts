import type { ApiTypes } from "../shared/ApiTypes"
import { RecordMap } from "../shared/schema"
import { httpRequest } from "./httpRequest"

type ApiResponse<Body> = { status: 200; body: Body } | { status: Exclude<number, 200>; body?: any }

export async function apiRequest<T extends keyof ApiTypes>(
	name: T,
	args: ApiTypes[T]["input"],
	onUpdateRecordMap: (recordMap: RecordMap) => void
): Promise<ApiResponse<Awaited<ApiTypes[T]["output"]>>> {
	const result = await httpRequest("/api/" + name, args)

	// await sleep(5000)

	// Update the local cache with any records returned from the server.
	// By convention, any API request can return a recordMap.
	if (result.status === 200) {
		if (result.body?.recordMap) {
			onUpdateRecordMap(result.body.recordMap)
		}
	}

	return result
}

export type ClientApi = {
	[ApiName in keyof ApiTypes]: (
		args: ApiTypes[ApiName]["input"]
	) => Promise<ApiResponse<Awaited<ApiTypes[ApiName]["output"]>>>
}

export function createClientApi(args: { onUpdateRecordMap: (recordMap: RecordMap) => void }) {
	const { onUpdateRecordMap } = args
	return new Proxy(
		{},
		{
			get(target, key: any, reciever) {
				return (args: any) => apiRequest(key, args, onUpdateRecordMap)
			},
		}
	) as ClientApi
}
