export type RootRoute = { type: "root" }
export type DesignRoute = { type: "design"; page?: string }
export type LogoutRoute = { type: "logout" }
export type LoginRoute = { type: "login" }
export type ProductRoute = { type: "product" }
export type ThreadRoute = { type: "thread"; threadId: string }
export type UnknownRoute = { type: "unknown"; url: string }

export type Route =
	| RootRoute
	| DesignRoute
	| LogoutRoute
	| ThreadRoute
	| LoginRoute
	| ProductRoute
	| UnknownRoute

export function parseRoute(url: string): Route {
	const parsed = new URL(url)
	if (parsed.pathname === "/") return { type: "root" }
	if (parsed.pathname === "/") return { type: "product" }
	if (parsed.pathname === "/design") {
		const page = parsed.searchParams.get("page") || undefined
		return { type: "design", page }
	}
	if (parsed.pathname === "/logout") return { type: "logout" }
	if (parsed.pathname === "/login") return { type: "login" }

	{
		const params = matchRoutePath("/thread/:threadId", parsed.pathname)
		if (params) {
			return { type: "thread", threadId: params.threadId }
		}
	}

	return { type: "unknown", url }
}
export function formatRoute(route: Route) {
	if (route.type === "root") return "/"
	if (route.type === "design") {
		if (route.page) return "/design?page=" + route.page
		return "/design"
	}
	if (route.type === "logout") return "/logout"
	if (route.type === "product") return "/product"
	if (route.type === "login") return "/login"
	if (route.type === "thread") return `/thread/${route.threadId}`
}

type Params = { [key: string]: string }

function matchRoutePath(pattern: string, urlPath: string): Params | null {
	const patternSegments = pattern.split("/")
	const urlSegments = urlPath.split("/")

	if (patternSegments.length !== urlSegments.length) {
		return null
	}

	let params: Params = {}

	for (let i = 0; i < patternSegments.length; i++) {
		const patternSegment = patternSegments[i]
		const urlSegment = urlSegments[i]

		if (patternSegment.startsWith(":")) {
			const key = patternSegment.slice(1)
			params[key] = urlSegment
		} else if (patternSegment !== urlSegment) {
			return null
		}
	}

	return params
}
