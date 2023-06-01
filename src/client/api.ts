import { ApiTypes } from "../shared/ApiTypes"

type ApiResponse<Body> =
	| { status: 200; body: Body }
	| { status: number; body?: any }

export async function apiRequest<T extends keyof ApiTypes>(
	name: T,
	args: ApiTypes[T]["input"]
): Promise<ApiResponse<ApiTypes[T]["output"]>> {
	let response: Response
	try {
		response = await fetch("/api/" + name, {
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
		const body = await response.json()
		return { status: 200, body }
	}

	let body: any
	try {
		body = response.json()
	} catch (error) {
		console.warn("Could not parse body of error response.")
	}

	return { status: response.status, body }
}

export type Api = {
	[ApiName in keyof ApiTypes]: (
		args: ApiTypes[ApiName]["input"]
	) => ApiResponse<ApiTypes[ApiName]["output"]>
}

export const api = new Proxy(
	{},
	{
		get(target, key: any, reciever) {
			return (args: any) => apiRequest(key, args)
		},
	}
) as Api
