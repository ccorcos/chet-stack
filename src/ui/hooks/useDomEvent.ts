import React from "react"

export function useDomEvent(
	event: string,
	callback: (e: Event) => void,
	deps: React.DependencyList = []
) {
	React.useEffect(() => {
		document.addEventListener(event, callback)
		return () => {
			document.removeEventListener(event, callback)
		}
	}, deps)
}
