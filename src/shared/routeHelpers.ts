export type RootRoute = { type: "root" }
export type DesignRoute = { type: "design"; params: Record<string, string> }
export type UnknownRoute = { type: "unknown"; url: string }

export type Route = RootRoute | DesignRoute | UnknownRoute

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
	const parsed = new URL(url.startsWith("/") ? "https://example.com" + url : url)
	if (parsed.pathname === "/") return { type: "root" }
	if (parsed.pathname === "/design") {
		return { type: "design", params: parseSearchParams(parsed) }
	}
	return { type: "unknown", url }
}

export function formatRoute(route: Route) {
	if (route.type === "root") return "/"
	if (route.type === "design") {
		if (route.params) {
			return "/design?" + formatSearchParams(route.params)
		}
		return "/design"
	}
	throw new Error("Unknown route:" + JSON.stringify(route))
}

// `/thread/:threadId` will return {threadId: string}
function matchRoutePath(pattern: string, urlPath: string) {
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
