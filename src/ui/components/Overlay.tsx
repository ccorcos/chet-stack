import React, { useLayoutEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { useShortcut } from "../hooks/useShortcut"

// TODO: can we get rid of these?
const dismissZIndex = undefined // 99
const overlayZIndex = undefined //100

export function Overlay(props: {
	anchor: HTMLElement
	children?: React.ReactNode
	onDismiss?: () => void
}) {
	const { anchor, onDismiss, children } = props

	// Create the portal div.
	const container = useMemo(() => {
		const div = document.createElement("div")
		document.body.appendChild(div)
		return div
	}, [])

	// Cleanup the portal div.
	useLayoutEffect(() => {
		return () => {
			document.body.removeChild(container)
		}
	}, [])

	// Measure the anchor
	const rect = useMemo(() => anchor.getBoundingClientRect(), [anchor])

	useShortcut("escape", () => onDismiss?.())

	// Render the portal
	return createPortal(
		<>
			{onDismiss && (
				<div
					style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: dismissZIndex }}
					onClick={() => onDismiss()}
				/>
			)}
			<div
				style={{
					position: "fixed",
					top: rect.top,
					left: rect.left,
					width: rect.width,
					height: rect.height,
					zIndex: overlayZIndex,
				}}
			>
				{children}
			</div>
		</>,
		container
	)
}
