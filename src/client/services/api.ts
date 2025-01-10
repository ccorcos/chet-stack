import type * as apis from "../../server/apis/autoindex"
import { proxyObj } from "../../shared/proxyHelpers"
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
	await sleep(500)

	return result as ApiResponse<any>
}

export type ClientApi = {
	[ApiName in keyof ApiSchema]: (
		args: ApiSchema[ApiName]["input"]
	) => Promise<ApiResponse<Awaited<ApiSchema[ApiName]["output"]>>>
}

export function createApi() {
	return proxyObj((key, args) => apiRequest(key, args)) as ClientApi
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
			headers: { "Content-Type": typeof args === "string" ? "text/plain" : "application/json" },
			body: typeof args === "string" ? args : JSON.stringify(args),
		})
	} catch (error) {
		// Offline
		return { status: 0 }
	}

	if (response.status === 200) {
		try {
			const contentType = response.headers.get("Content-Type")
			if (contentType?.includes("application/json")) {
				const body = await response.json()
				return { status: 200, body }
			} else {
				const body = await response.text()
				return { status: 200, body }
			}
		} catch (error) {
			return { status: 200, body: undefined }
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
