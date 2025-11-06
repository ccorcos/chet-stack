import { passthroughRef } from "client/helpers/passthroughRef"
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

export const TopbarLayout = passthroughRef(_TopbarLayout)

function _TopbarLayout(props: JSX.IntrinsicElements["div"] & { show?: boolean }) {
	const { show: _show, ...rest } = props
	const show = _show ?? true

	const { isVisible, handleTransitionEnd } = useIsVisible(show)

	return (
		<div
			style={{
				flexGrow: 0,
				flexShrink: 0,
				background: "var(--bg0)",
				transition: `height ${transition}`,
				height: show ? 64 : 0,
				overflow: "hidden",
				position: "relative",
				borderRadius: BORDER_RADIUS,
			}}
			onTransitionEnd={handleTransitionEnd}
		>
			{/* Wrap in a div to prevent animation from squishing content. */}
			<div
				{...rest}
				style={{
					position: "absolute",
					bottom: 0,
					left: 0,
					right: 0,
					height: 64,
					...props.style,
				}}
			>
				{isVisible && props.children}
			</div>
		</div>
	)
}

export const BottombarLayout = passthroughRef(_BottombarLayout)

function _BottombarLayout(props: JSX.IntrinsicElements["div"] & { show?: boolean }) {
	const { show: _show, ...rest } = props
	const show = _show ?? true

	const { isVisible, handleTransitionEnd } = useIsVisible(show)

	return (
		<div
			style={{
				flexGrow: 0,
				flexShrink: 0,
				// borderTop: "2px solid var(--border)",
				background: "var(--bg0)",
				transition: `height ${transition}`,
				height: show ? 64 : 0,
				overflow: "hidden",
				position: "relative",
				borderRadius: BORDER_RADIUS,
			}}
			onTransitionEnd={handleTransitionEnd}
		>
			{/* Wrap in a div to prevent animation from squishing content. */}
			<div
				{...rest}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: 64,
					...props.style,
				}}
			>
				{isVisible && props.children}
			</div>
		</div>
	)
}

export const LeftPanelLayout = passthroughRef(_LeftPanelLayout)

function _LeftPanelLayout(props: JSX.IntrinsicElements["div"] & { show?: boolean }) {
	const { show: _show, ...rest } = props
	const show = _show ?? true

	const { isVisible, handleTransitionEnd } = useIsVisible(show)

	return (
		<div
			style={{
				flexGrow: 0,
				flexShrink: 0,
				// borderRight: "2px solid var(--border)",
				background: "var(--bg0)",
				transition: `width ${transition}`,
				width: show ? 256 : 0,
				overflowX: "hidden",
				overflowY: "auto",
				position: "relative",
				borderRadius: BORDER_RADIUS,
			}}
			onTransitionEnd={handleTransitionEnd}
		>
			{/* Wrap in a div to prevent animation from squishing content. */}
			<div
				{...rest}
				style={{
					position: "absolute",
					minHeight: "100%",
					right: 0,
					width: 256,
					...props.style,
				}}
			>
				{isVisible && props.children}
			</div>
		</div>
	)
}
export const RightPanelLayout = passthroughRef(_RightPanelLayout)

function _RightPanelLayout(props: JSX.IntrinsicElements["div"] & { show?: boolean }) {
	const { show: _show, ...rest } = props
	const show = _show ?? true

	const { isVisible, handleTransitionEnd } = useIsVisible(show)

	return (
		<div
			style={{
				flexGrow: 0,
				flexShrink: 0,
				// borderLeft: "2px solid var(--border)",
				background: "var(--bg0)",
				transition: `width ${transition}`,
				width: show ? 256 : 0,
				overflowX: "hidden",
				overflowY: "auto",
				position: "relative",
				borderRadius: BORDER_RADIUS,
			}}
			onTransitionEnd={handleTransitionEnd}
		>
			{/* Wrap in a div to prevent animation from squishing content. */}
			<div
				{...rest}
				style={{
					position: "absolute",
					minHeight: "100%",
					left: 0,
					width: 256,
					...props.style,
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
			{...props}
			style={{
				flexGrow: 1,
				background: "var(--bg0)",
				overflowY: "auto",
				// padding: "16px",
				borderRadius: BORDER_RADIUS,
				...props.style,
			}}
		>
			{props.children}
		</div>
	)
}

export function Layout(props: {
	className?: string
	style?: React.CSSProperties
	Topbar?: React.ReactNode
	LeftPanel?: React.ReactNode
	children?: React.ReactNode
	RightPanel?: React.ReactNode
	Bottombar?: React.ReactNode
}) {
	return (
		<div
			className={props.className}
			style={{
				height: "100vh",
				display: "flex",
				flexDirection: "column",
				gap: GAP,
				background: "var(--background2)",
				...props.style,
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
