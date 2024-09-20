import React from "react"

const GAP = 1

const transition = "0.15s cubic-bezier(0.4, 0, 0.2, 1)"
export function TopbarLayout(props: JSX.IntrinsicElements["div"] & { show: boolean }) {
	const { show, ...rest } = props
	return (
		<div
			{...rest}
			style={{
				flexGrow: 0,
				flexShrink: 0,
				// borderBottom: "2px solid var(--transparent1)",
				background: "var(--background)",
				transition: `height ${transition}`,
				height: props.show ? 64 : 0,
				overflow: "hidden",
				position: "relative",
				...props.style,
			}}
		>
			<div
				style={{
					position: "absolute",
					bottom: 0,
					left: 0,
					right: 0,
					height: 64,
				}}
			>
				{props.children}
			</div>
		</div>
	)
}

export function BottombarLayout(props: JSX.IntrinsicElements["div"] & { show: boolean }) {
	const { show, ...rest } = props
	return (
		<div
			{...rest}
			style={{
				flexGrow: 0,
				flexShrink: 0,
				// borderTop: "2px solid var(--transparent1)",
				background: "var(--background)",
				transition: `height ${transition}`,
				height: props.show ? 64 : 0,
				overflow: "hidden",
				position: "relative",
				...props.style,
			}}
		>
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: 64,
				}}
			>
				{props.children}
			</div>
		</div>
	)
}

export function LeftPanelLayout(props: JSX.IntrinsicElements["div"] & { show: boolean }) {
	const { show, ...rest } = props
	return (
		<div
			{...rest}
			style={{
				flexGrow: 0,
				flexShrink: 0,
				// borderRight: "2px solid var(--transparent1)",
				background: "var(--background)",
				transition: `width ${transition}`,
				width: props.show ? 256 : 0,
				overflow: "hidden",
				position: "relative",
				...props.style,
			}}
		>
			<div
				style={{
					position: "absolute",
					top: 0,
					bottom: 0,
					right: 0,
					width: 256,
				}}
			>
				{props.children}
			</div>
		</div>
	)
}

export function RightPanelLayout(props: JSX.IntrinsicElements["div"] & { show: boolean }) {
	const { show, ...rest } = props
	return (
		<div
			{...rest}
			style={{
				flexGrow: 0,
				flexShrink: 0,
				// borderLeft: "2px solid var(--transparent1)",
				background: "var(--background)",
				transition: `width ${transition}`,
				width: props.show ? 256 : 0,
				overflow: "hidden",
				position: "relative",
				...props.style,
			}}
		>
			<div
				style={{
					position: "absolute",
					top: 0,
					bottom: 0,
					left: 0,
					width: 256,
				}}
			>
				{props.children}
			</div>
		</div>
	)
}

export function Layout(props: {
	Topbar?: React.ReactNode
	LeftPanel?: React.ReactNode
	children?: React.ReactNode
	RightPanel?: React.ReactNode
	Bottombar?: React.ReactNode
}) {
	return (
		<div
			style={{
				height: "100vh",
				display: "flex",
				flexDirection: "column",
				gap: GAP,
				background: "var(--background2)",
			}}
		>
			{props.Topbar}

			<div style={{ flexGrow: 1, display: "flex", overflow: "hidden", gap: GAP }}>
				{props.LeftPanel}

				<div
					style={{
						flexGrow: 1,
						overflowY: "auto",
						padding: "16px",
						background: "var(--background)",
					}}
				>
					{props.children}
				</div>

				{props.RightPanel}
			</div>

			{props.Bottombar}
		</div>
	)
}
