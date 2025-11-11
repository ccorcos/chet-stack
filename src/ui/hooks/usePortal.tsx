import { useLayoutEffect, useRef } from "react"

export function usePortal() {
	// Create the portal div.
	let divRef = useRef<HTMLDivElement>(null)
	if (!divRef.current) {
		const div = document.createElement("div")
		divRef.current = div
	}

	useLayoutEffect(() => {
		const div = divRef.current
		if (!div) return
		document.body.appendChild(div)
		return () => {
			document.body.removeChild(div)
		}
	}, [])
	return divRef.current
}
