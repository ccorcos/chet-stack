import React from "react"
import { Spinner } from "../Spinner"

// TODO: Throttle component
export function SpinnerDemo() {
	return (
		<div style={{ display: "flex", gap: 4, padding: 12 }}>
			<Spinner />
		</div>
	)
}
