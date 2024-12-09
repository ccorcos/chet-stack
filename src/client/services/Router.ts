import { useEffect, useState } from "react"
import { useClientEnvironment } from "./ClientEnvironment"

const ORIGIN = window.location.origin

function isExternalLink(url: string) {
	if (url.startsWith("/")) return false
	if (url.startsWith(ORIGIN)) return false
	return true
}

function getRelativeUrl(link: string) {
	if (isExternalLink(link)) throw new Error("Cannot get relative URL of external link")
	if (link.startsWith("/")) return link
	return link.slice(ORIGIN.length)
}

// HistoryState is currently unused. This is where you would save stuff like scroll
// position or selection so you can restore when navigating back.
export type HistoryState = {}

export type RouterState = {
	route: string
	historyState: HistoryState | undefined
}

export class Router {
	state: RouterState

	constructor() {
		const route = getRelativeUrl(window.location.href)
		const historyState: HistoryState | undefined = window.history.state
		this.state = { route, historyState }
		window.onpopstate = this.onPopState
	}

	private onPopState = (event: PopStateEvent) => {
		const route = getRelativeUrl(window.location.href)
		const historyState: HistoryState | undefined = event.state
		this.setState({ historyState, route })
	}

	private listeners: Set<(state: RouterState) => void> = new Set()
	addListener(fn: (state: RouterState) => void) {
		this.listeners.add(fn)
		return () => {
			this.listeners.delete(fn)
		}
	}

	private setState(state: RouterState) {
		this.state = state
		for (const listener of this.listeners) {
			listener(state)
		}
	}

	navigate = (link: string) => {
		// Open external links in a new tab.
		if (isExternalLink(link)) return window.open(link, "_blank")

		const route = getRelativeUrl(link)
		const historyState = undefined
		window.history.pushState(historyState, "", route)
		this.setState({ historyState, route })
	}

	setParam = (key: string, value: string) => {
		const url = new URL(window.location.href)
		url.searchParams.set(key, value)
		const route = getRelativeUrl(url.toString())

		const historyState = undefined
		window.history.replaceState(historyState, "", route)
		this.setState({ route, historyState })
	}

	back = () => {
		window.history.back()
	}

	forward = () => {
		window.history.forward()
	}
}

export function useRoute() {
	const { router } = useClientEnvironment()
	const [state, setState] = useState(router.state)
	useEffect(() => {
		return router.addListener(setState)
	}, [])
	return state.route
}
