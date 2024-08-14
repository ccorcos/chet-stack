import React, { Suspense } from "react"
import { ClientEnvironment, ClientEnvironmentProvider } from "../services/ClientEnvironment"
import { useRoute } from "../services/Router"
import { Design } from "./Design"
import { Login } from "./Login"
import { Logout } from "./Logout"
import { Product } from "./Product"
import { Root } from "./Root"
import { Spinner } from "./Spinner"
import { Throttle } from "./Throttle"

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
	if (route.type === "root" || route.type === "thread") return <Root />
	if (route.type === "design") return <Design page={route.page} />
	if (route.type === "logout") return <Logout />
	if (route.type === "login") return <Login />
	if (route.type === "product") return <Product />
	return <div>Unknown route: {route.url}</div>
}
