import React from "react"
import { displayShortcut } from "../helpers/shortcut"

export function Shortcut(props: { shortcut?: string | string[] }) {
	const { shortcut } = props
	if (!shortcut) return false
	if (typeof shortcut === "string") return <Token>{displayShortcut(shortcut)}</Token>
	return (
		<div style={{ display: "flex", gap: 4 }}>
			{shortcut.map((s) => (
				<Token>{displayShortcut(s)}</Token>
			))}
		</div>
	)
}

function Token(props: { children: React.ReactNode }) {
	return (
		<span
			style={{
				background: "var(--bg2)",
				color: "var(--fg2)",
				fontSize: 12,
				padding: "2px 4px",
				borderRadius: 4,
				alignSelf: "center",
			}}
		>
			{props.children}
		</span>
	)
}
