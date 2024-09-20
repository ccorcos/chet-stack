import React from "react"
import { passthroughRef } from "../../helpers/passthroughRef"

function _TopbarLayout(props: JSX.IntrinsicElements["div"] & { show: boolean }) {
	const { show, ...rest } = props
	return (
		<div
			{...rest}
			style={{
				flexGrow: 0,
				flexShrink: 0,
				borderBottom: "2px solid var(--transparent1)",
				transition: !props.show ? "height 0.1s ease-in" : "height 0.1s ease-out",
				height: props.show ? 64 : 0,
				overflow: "hidden",
				...props.style,
			}}
		/>
	)
}

export const TopbarLayout = passthroughRef(_TopbarLayout)

function _BottombarLayout(props: JSX.IntrinsicElements["div"] & { show: boolean }) {
	const { show, ...rest } = props
	return (
		<div
			{...rest}
			style={{
				flexGrow: 0,
				flexShrink: 0,
				borderTop: "2px solid var(--transparent1)",
				transition: !props.show ? "height 0.1s ease-in" : "height 0.1s ease-out",
				height: props.show ? 64 : 0,
				overflow: "hidden",
				...props.style,
			}}
		/>
	)
}

export const BottombarLayout = passthroughRef(_BottombarLayout)

function _LeftPanelLayout(props: JSX.IntrinsicElements["div"] & { show: boolean }) {
	const { show, ...rest } = props
	return (
		<div
			{...rest}
			style={{
				flexGrow: 0,
				flexShrink: 0,
				borderRight: "2px solid var(--transparent1)",
				transition: !props.show ? "width 0.1s ease-in" : "width 0.1s ease-out",
				width: props.show ? 256 : 0,
				overflow: "hidden",
				...props.style,
			}}
		/>
	)
}

export const LeftPanelLayout = passthroughRef(_LeftPanelLayout)

function _RightPanelLayout(props: JSX.IntrinsicElements["div"] & { show: boolean }) {
	const { show, ...rest } = props
	return (
		<div
			{...rest}
			style={{
				flexGrow: 0,
				flexShrink: 0,
				borderLeft: "2px solid var(--transparent1)",
				transition: !props.show ? "width 0.1s ease-in" : "width 0.1s ease-out",
				width: props.show ? 256 : 0,
				overflow: "hidden",
				...props.style,
			}}
		/>
	)
}

export const RightPanelLayout = passthroughRef(_RightPanelLayout)

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
				gap: 8,
			}}
		>
			{props.Topbar}

			<div style={{ flexGrow: 1, display: "flex", overflow: "hidden" }}>
				{props.LeftPanel}

				<div style={{ flexGrow: 1, overflowY: "auto", padding: "16px" }}>{props.children}</div>

				{props.RightPanel}
			</div>

			{props.Bottombar}
		</div>
	)
}
