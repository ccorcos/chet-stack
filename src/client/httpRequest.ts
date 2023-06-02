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
		const body = await response.json()
		return { status: 200, body }
	}

	let body: any
	try {
		body = await response.json()
	} catch (error) {
		console.warn("Could not parse body of error response.")
	}

	return { status: response.status, body }
}
