import React from "react"
import { Spinner } from "../components/Spinner"

// TODO: Throttle component
export function SpinnerDemo() {
	return (
		<div style={{ display: "flex", gap: 4, padding: 12 }}>
			<Spinner />
		</div>
	)
}
