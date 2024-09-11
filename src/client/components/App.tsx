import React from "react"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { useRoute } from "../services/Router"

export function App() {
	const environment = useClientEnvironment()
	const route = useRoute()

	return <div style={{ display: "flex", height: "100vh" }}>hellow worlds</div>
}
