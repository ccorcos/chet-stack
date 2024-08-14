import { flatten } from "lodash"
import type * as apis from "../../server/apis/autoindex"
import { BatchedQueue } from "../../shared/BatchedQueue"
import { sleep } from "../../shared/sleep"

type InputOutput<T extends (...any: any[]) => any> = {
	input: Parameters<T>[1]
	output: ReturnType<T>
}

type Apis = typeof apis
type ApiSchema = { [K in keyof Apis]: InputOutput<Apis[K]["handler"]> }

// https://github.com/microsoft/TypeScript/issues/55095
type StatusCode = 0 | 200 | 400 | 409 | 424 | 403 | 500
type ErrorStatusCode = Exclude<StatusCode, 200>
type ErrorResponse = { status: ErrorStatusCode; body?: unknown }

type ApiResponse<Body> = { status: 200; body: Body } | ErrorResponse

const debug = (...args: any[]) => console.log("api:", ...args)

export async function apiRequest<T extends keyof ApiSchema>(
	name: T,
	args: ApiSchema[T]["input"]
): Promise<ApiResponse<Awaited<ApiSchema[T]["output"]>>> {
	debug(name, JSON.stringify(args))

	const result = await httpRequest("/api/" + name, args)

	// Control how much loading spinners we see during development.
	await sleep(400)

	return result as ApiResponse<any>
}

export type ClientApi = {
	[ApiName in keyof ApiSchema]: (
		args: ApiSchema[ApiName]["input"]
	) => Promise<ApiResponse<Awaited<ApiSchema[ApiName]["output"]>>>
}

export function createApi() {
	const getRecordsQueue = new BatchedQueue<
		ApiSchema["getRecords"]["input"],
		ApiResponse<Awaited<ApiSchema["getRecords"]["output"]>>
	>({
		async processBatch(args) {
			const pointers = flatten(args.map((args) => args.pointers))
			const response = await apiRequest("getRecords", { pointers })

			// This is going to return more records than expected but that's fine.
			// Otherwise, we need to crawl ancestor records to filter things out for each request.
			return args.map(() => response)
		},
		maxBatchSize: 1000,
		maxParallel: 5,
		delayMs: 2,
	})

	const getSignedFileUrlsQueue = new BatchedQueue<
		ApiSchema["getSignedFileUrls"]["input"],
		ApiResponse<Awaited<ApiSchema["getSignedFileUrls"]["output"]>>
	>({
		async processBatch(args) {
			const fileIds = flatten(args.map((args) => args.fileIds))
			const response = await apiRequest("getSignedFileUrls", { fileIds })

			// This is going to return more records than expected but that's fine.
			// Otherwise, we need to crawl ancestor records to filter things out for each request.
			return args.map(() => response)
		},
		maxBatchSize: 1000,
		maxParallel: 5,
		delayMs: 2,
	})

	return new Proxy(
		{},
		{
			get(target, key: any, reciever) {
				return (args: any) => {
					if (key === "getRecords") return getRecordsQueue.enqueue(args)
					if (key === "getSignedFileUrls") return getSignedFileUrlsQueue.enqueue(args)
					return apiRequest(key, args)
				}
			},
		}
	) as ClientApi
}

export function formatResponseError(response: ErrorResponse) {
	const { status, body } = response
	if (body === null) return `${status}: Unkown error.`
	if (body === undefined) return `${status}: Unkown error.`
	if (typeof body === "string") return body
	if (typeof body === "object") {
		if ("message" in body) {
			if (typeof body.message === "string") {
				return body.message
			}
		}
	}
	return `${status}: ${JSON.stringify(body)}`
}

export type HttpResponse<Body = any> = { status: 200; body: Body } | { status: number; body?: any }

// Only POST requests for now because this is only used for the API.
export async function httpRequest(url: string, args: any): Promise<HttpResponse> {
	let response: Response
	try {
		response = await fetch(url, {
			method: "post",
			credentials: "same-origin",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(args),
		})
	} catch (error) {
		// Offline
		return { status: 0 }
	}

	if (response.status === 200) {
		try {
			const body = await response.json()
			return { status: 200, body }
		} catch (error) {
			return { status: 200, body: {} }
		}
	}

	let body: any
	try {
		body = await response.json()
	} catch (error) {
		console.warn("Could not parse body of error response.")
	}

	return { status: response.status, body }
}
