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
				fontSize: 14,
				padding: "4px 8px",
				borderRadius: 4,
				backgroundColor: "var(--bg2)",
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
