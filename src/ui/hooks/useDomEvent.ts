import React from "react"
import { useRefCurrent } from "./useRefCurrent"

export function useDomEvent(eventName: string, callback: (e: Event) => void) {
	const callbackRef = useRefCurrent(callback)

	React.useEffect(() => {
		const fn = (event) => callbackRef.current(event)
		document.addEventListener(eventName, fn)
		return () => {
			document.removeEventListener(eventName, fn)
		}
	}, [])
}
