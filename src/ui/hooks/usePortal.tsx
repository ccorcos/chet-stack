import { useLayoutEffect, useMemo } from "react"

export function usePortal() {
	// Create the portal div.
	const div = useMemo(() => {
		const div = document.createElement("div")
		document.body.appendChild(div)
		return div
	}, [])

	// Cleanup the portal div.
	useLayoutEffect(() => {
		return () => {
			document.body.removeChild(div)
		}
	}, [])

	return div
}
