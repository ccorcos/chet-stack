import React, { Suspense } from "react"
import { parseRoute } from "shared/routeHelpers"
import { Spinner } from "ui/components/Spinner"
import { Throttle } from "ui/components/Throttle"
import { useRouterState } from "ui/services/Router"
import { useDarkModeSwitcher } from "../hooks/useDarkModeSwitcher"
import {
	ClientEnvironment,
	ClientEnvironmentProvider,
	useClientEnvironment,
} from "../services/ClientEnvironment"
import { App } from "./App"
import { Commander } from "./Commander"
import { Design } from "./Design"

export function Root(props: { environment: ClientEnvironment }) {
	return (
		<Suspense fallback={<Loading />}>
			<ClientEnvironmentProvider value={props.environment}>
				<Commander />
				<Router />
			</ClientEnvironmentProvider>
		</Suspense>
	)
}

function Loading() {
	return (
		<div style={{ textAlign: "center", marginTop: "33vh" }}>
			<Throttle showSpinner={true} spinner={<Spinner />}>
				<></>
			</Throttle>
		</div>
	)
}

function Router() {
	useDarkModeSwitcher()

	const { router } = useClientEnvironment()
	const routerState = useRouterState(router)
	const route = parseRoute(routerState.url)

	if (route.path === "/") return <App />
	if (route.path === "/design") return <Design params={route.params} />
	return <div>Unknown route: {routerState.url}</div>
}
