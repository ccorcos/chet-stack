import { formatRelative } from "date-fns"
import React, { useEffect, useState } from "react"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { useRoute } from "../services/Router"

export function App() {
	const environment = useClientEnvironment()
	const route = useRoute()

	return <div style={{ display: "flex", height: "100vh" }}>hellow worlds</div>
}

function useOnline() {
	// TODO: an improved online/offline detector would ping the server to see if its online.
	// When the browser is online, but the server is down, this still says online.
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

function OfflineBadge() {
	const online = useOnline()
	return (
		<Badge style={{ backgroundColor: online ? undefined : "var(--orange)" }}>
			{online ? "Online" : <strong>Offline</strong>}
		</Badge>
	)
}

function joinElements(elements: JSX.Element[], sep: (key: string) => JSX.Element) {
	const [first, ...rest] = elements
	const result = [first]
	for (let i = 0; i < rest.length; i++) {
		result.push(sep("sep-" + i))
		result.push(rest[i])
	}
	return result
}

function formatDate(isoDate: string) {
	const now = new Date()
	const target = new Date(isoDate)
	return formatRelative(target, now)
}

function Badge(props: {
	children: React.ReactNode
	style?: React.CSSProperties
	onClick?: React.MouseEventHandler
	onKeyDown?: React.KeyboardEventHandler
	tabIndex?: 0 | -1
}) {
	return (
		<div
			style={{
				display: "inline-block",
				fontSize: "0.8em",
				padding: "0.2em 0.4em",
				borderRadius: "0.2em",
				backgroundColor: "var(--gray3)",
				...props.style,
			}}
			tabIndex={props.tabIndex}
			onClick={props.onClick}
			onKeyDown={props.onKeyDown}
		>
			{props.children}
		</div>
	)
}
