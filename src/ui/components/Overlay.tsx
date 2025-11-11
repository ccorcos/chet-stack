import React, { useMemo } from "react"
import { createPortal } from "react-dom"
import { usePortal } from "ui/hooks/usePortal"
import { useShortcut } from "../hooks/useShortcut"

const dismissZIndex = undefined // 99
const overlayZIndex = undefined //100

/**
 * Use this for rendering on top of something else.
 * In Notion or Excel table cells are not editble, then we you click, an input is overlaid on top to edit.
 */
export function Overlay(props: {
	anchor: HTMLElement
	children?: React.ReactNode
	onDismiss?: () => void
}) {
	const { anchor, onDismiss, children } = props

	const div = usePortal()

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
		div
	)
}
