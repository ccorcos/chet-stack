import { useEffect, useState } from "react"
import { Route, formatRoute, parseRoute } from "../../shared/routeHelpers"
import { useClientEnvironment } from "./ClientEnvironment"

// HistoryState is currently unused. This is where you would save stuff like scroll
// position or selection so you can restore when navigating back.
export type HistoryState = {}

export type RouterState = {
	route: Route
	historyState: HistoryState | undefined
}

export class Router {
	state: RouterState

	constructor() {
		const historyState: HistoryState | undefined = window.history.state
		const route = parseRoute(window.location.href)
		this.state = { route, historyState }
		window.onpopstate = this.onPopState
	}

	private onPopState = (event: PopStateEvent) => {
		const url = window.location.href
		const route = parseRoute(url)
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

	navigate = (route: Route) => {
		const historyState = undefined
		window.history.pushState(historyState, "", formatRoute(route))
		this.setState({ historyState, route })
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
