import React, { Suspense } from "react"
import { ClientEnvironment, ClientEnvironmentProvider } from "../services/ClientEnvironment"
import { useRoute } from "../services/Router"
import { App } from "./App"
import { Throttle } from "./Throttle"
import { Design } from "./ui/Design"
import { Spinner } from "./ui/Spinner"

export function Container(props: { environment: ClientEnvironment }) {
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
	const route = useRoute()
	if (route.type === "root") return <App />
	if (route.type === "design") return <Design page={route.page} />
	return <div>Unknown route: {route.url}</div>
}
