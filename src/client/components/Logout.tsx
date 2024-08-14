import React from "react"
import { logout } from "../actions/logout"
import { useAsync } from "../hooks/useAsync"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { Spinner } from "./Spinner"
import { Throttle } from "./Throttle"

export function Logout() {
	const environment = useClientEnvironment()
	const result = useAsync(() => logout(environment).then(() => true), [])
	return (
		<div style={{ textAlign: "center", marginTop: "33vh" }}>
			<Throttle showSpinner={!result} spinner={<Spinner />}>
				<></>
			</Throttle>
		</div>
	)
}
