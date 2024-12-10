import React, { Suspense } from "react"
import { parseRoute } from "../../shared/routeHelpers"
import { ClientEnvironment, ClientEnvironmentProvider } from "../services/ClientEnvironment"
import { useRouterState } from "../services/Router"
import { App } from "./App"
import { Design } from "./Design"
import { Spinner } from "./ui/Spinner"
import { Throttle } from "./ui/Throttle"

export function Root(props: { environment: ClientEnvironment }) {
	return (
		<Suspense fallback={<Loading />}>
			<ClientEnvironmentProvider value={props.environment}>
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
	const routerState = useRouterState()
	console.log(routerState)
	const route = parseRoute(routerState.url)

	if (route.type === "root") return <App />
	if (route.type === "design") return <Design params={route.params} />
	return <div>Unknown route: {route.url}</div>
}
