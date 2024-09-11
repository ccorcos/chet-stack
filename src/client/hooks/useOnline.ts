import { useEffect, useState } from "react"

// TODO: an improved online/offline detector would ping the server to see if its online.
// When the browser is online, but the server is down, this still says online.
// You can also monitor api requests or the websocket connection as well.
export function useOnline() {
	const [state, setState] = useState(navigator.onLine)
	useEffect(() => {
		const setOnline = () => setState(true)
		const setOffline = () => setState(false)
		window.addEventListener("online", setOnline)
		window.addEventListener("offline", setOffline)
		return () => {
			window.removeEventListener("online", setOnline)
			window.removeEventListener("offline", setOffline)
		}
	}, [])
	return state
}
