import React, { useCallback } from "react"

const GAP = 1
const BORDER_RADIUS = 0

const transition = "0.15s cubic-bezier(0.4, 0, 0.2, 1)"

function useIsVisible(show: boolean) {
	const [isVisible, setIsVisible] = React.useState(show)

	React.useEffect(() => {
		if (show) setIsVisible(true)
	}, [show])

	const handleTransitionEnd = useCallback(() => {
		if (!show) setIsVisible(false)
	}, [show])

	return { isVisible, handleTransitionEnd }
}

export function TopbarLayout(props: JSX.IntrinsicElements["div"] & { show: boolean }) {
	const { show, ...rest } = props
	const { isVisible, handleTransitionEnd } = useIsVisible(show)

	return (
		<div
			{...rest}
			style={{
				flexGrow: 0,
				flexShrink: 0,
				// borderBottom: "2px solid var(--transparent1)",
				background: "var(--background)",
				transition: `height ${transition}`,
				height: show ? 64 : 0,
				overflow: "hidden",
				position: "relative",
				borderRadius: BORDER_RADIUS,
				...props.style,
			}}
			onTransitionEnd={handleTransitionEnd}
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
				{isVisible && props.children}
			</div>
		</div>
	)
}

export function BottombarLayout(props: JSX.IntrinsicElements["div"] & { show: boolean }) {
	const { show, ...rest } = props
	const { isVisible, handleTransitionEnd } = useIsVisible(show)

	return (
		<div
			{...rest}
			style={{
				flexGrow: 0,
				flexShrink: 0,
				// borderTop: "2px solid var(--transparent1)",
				background: "var(--background)",
				transition: `height ${transition}`,
				height: show ? 64 : 0,
				overflow: "hidden",
				position: "relative",
				borderRadius: BORDER_RADIUS,
				...props.style,
			}}
			onTransitionEnd={handleTransitionEnd}
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
				{isVisible && props.children}
			</div>
		</div>
	)
}

export function LeftPanelLayout(props: JSX.IntrinsicElements["div"] & { show: boolean }) {
	const { show, ...rest } = props
	const { isVisible, handleTransitionEnd } = useIsVisible(show)

	return (
		<div
			{...rest}
			style={{
				flexGrow: 0,
				flexShrink: 0,
				// borderRight: "2px solid var(--transparent1)",
				background: "var(--background)",
				transition: `width ${transition}`,
				width: show ? 256 : 0,
				overflow: "hidden",
				position: "relative",
				borderRadius: BORDER_RADIUS,
				...props.style,
			}}
			onTransitionEnd={handleTransitionEnd}
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
				{isVisible && props.children}
			</div>
		</div>
	)
}

export function RightPanelLayout(props: JSX.IntrinsicElements["div"] & { show: boolean }) {
	const { show, ...rest } = props
	const { isVisible, handleTransitionEnd } = useIsVisible(show)

	return (
		<div
			{...rest}
			style={{
				flexGrow: 0,
				flexShrink: 0,
				// borderLeft: "2px solid var(--transparent1)",
				background: "var(--background)",
				transition: `width ${transition}`,
				width: show ? 256 : 0,
				overflow: "hidden",
				position: "relative",
				borderRadius: BORDER_RADIUS,
				...props.style,
			}}
			onTransitionEnd={handleTransitionEnd}
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
				{isVisible && props.children}
			</div>
		</div>
	)
}

export function ContentLayout(props: JSX.IntrinsicElements["div"]) {
	return (
		<div
			style={{
				flexGrow: 1,
				background: "var(--background)",
				overflowY: "auto",
				padding: "16px",
				borderRadius: BORDER_RADIUS,
				...props.style,
			}}
		>
			{props.children}
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

				{props.children}

				{props.RightPanel}
			</div>

			{props.Bottombar}
		</div>
	)
}
