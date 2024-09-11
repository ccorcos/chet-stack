import React from "react"

export function Badge(props: {
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
