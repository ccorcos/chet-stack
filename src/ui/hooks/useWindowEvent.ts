import { useEffect } from "react"
import { useRefCurrent } from "./useRefCurrent"

export function useWindowEvent<K extends keyof WindowEventMap>(
	eventName: K,
	callback: (e: WindowEventMap[K]) => void,
	options?: AddEventListenerOptions
)
export function useWindowEvent(
	eventName: string,
	callback: (e: Event) => void,
	options?: AddEventListenerOptions
) {
	const callbackRef = useRefCurrent(callback)

	useEffect(() => {
		const fn = (event) => callbackRef.current(event)
		window.addEventListener(eventName, fn, options)
		return () => {
			window.removeEventListener(eventName, fn)
		}
	}, [])
}
