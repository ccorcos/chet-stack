/*

Simple tools for dealing with urls. Often on the client, we're dealing with relative urls, but
native new URL always requires a fully qualified url so we use `tmpOrigin` to make it work.
*/

export type Route = {
	/** e.g. "/design" */
	path: string
	/** e.g. {id: "123"} */
	params: Record<string, string>
	/** e.g. "#123" */
	hash: string
}

const tmpOrigin = "https://example.com"

function parseSearchParams(url: URL) {
	const params: Record<string, string> = {}
	url.searchParams.forEach((value, key) => {
		params[key] = value
	})
	return params
}

function formatSearchParams(params: Record<string, string>) {
	const urlParams = new URLSearchParams()
	for (const [key, value] of Object.entries(params)) {
		urlParams.set(key, value)
	}
	return urlParams.toString()
}

export function parseRoute(url: string): Route {
	const parsed = new URL(url.startsWith("/") ? tmpOrigin + url : url)
	return { path: parsed.pathname, params: parseSearchParams(parsed), hash: parsed.hash }
}

export function formatRoute(route: Partial<Route>) {
	let url = route.path || "/"
	if (!route.params) return url
	if (Object.keys(route.params).length === 0) return url
	url += "?" + formatSearchParams(route.params)
	if (route.hash) url += route.hash
	return url
}

export function setParam(url: string, key: string, value: string | undefined) {
	const parsed = new URL(url.startsWith("/") ? tmpOrigin + url : url)
	if (value === undefined) parsed.searchParams.delete(key)
	else parsed.searchParams.set(key, value)
	const newUrl = parsed.toString()
	if (url.startsWith("/")) return newUrl.slice(tmpOrigin.length)
	return newUrl
}

// `/thread/:threadId` will return {threadId: string}
export function matchRoutePath(pattern: string, urlPath: string) {
	const patternSegments = pattern.split("/")
	const urlSegments = urlPath.split("/")

	if (patternSegments.length !== urlSegments.length) {
		return
	}

	let params: { [key: string]: string } = {}

	for (let i = 0; i < patternSegments.length; i++) {
		const patternSegment = patternSegments[i]
		const urlSegment = urlSegments[i]

		if (patternSegment.startsWith(":")) {
			const key = patternSegment.slice(1)
			params[key] = urlSegment
		} else if (patternSegment !== urlSegment) {
			return
		}
	}

	return params
}
