import type { ApiTypes } from "../shared/ApiTypes"
import { RecordMap } from "../shared/schema"
import { sleep } from "../shared/sleep"
import { httpRequest } from "./httpRequest"

// https://github.com/microsoft/TypeScript/issues/55095
type StatusCode = 0 | 200 | 400 | 409 | 424 | 403 | 500
type ErrorStatusCode = Exclude<StatusCode, 200>

type ApiResponse<Body> =
	| { status: 200; body: Body }
	| { status: Exclude<StatusCode, 200>; body?: any }

const debug = (...args: any[]) => console.log("api:", ...args)

export async function apiRequest<T extends keyof ApiTypes>(
	name: T,
	args: ApiTypes[T]["input"],
	onUpdateRecordMap: (recordMap: RecordMap) => void
): Promise<ApiResponse<Awaited<ApiTypes[T]["output"]>>> {
	debug(name, JSON.stringify(args))

	const result = await httpRequest("/api/" + name, args)

	await sleep(2000)

	// Update the local cache with any records returned from the server.
	// By convention, any API request can return a recordMap.
	if (result.status === 200) {
		if (result.body?.recordMap) {
			onUpdateRecordMap(result.body.recordMap)
		}
	}

	return result as ApiResponse<any>
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
