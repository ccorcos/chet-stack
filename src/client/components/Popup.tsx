import { Placement, createPopper } from "@popperjs/core"
import React, { useLayoutEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { passthroughRef } from "../helpers/passthroughRef"
import { useShortcut } from "../hooks/useShortcut"

// Consider using react-popper
// https://popper.js.org/react-popper/v2/

export function Popup(props: {
	open: boolean
	anchor: HTMLElement | undefined | null
	placement?: Placement
	children?: React.ReactNode
	onDismiss?: () => void
}) {
	// Create the overlay div.
	const container = useMemo(() => {
		const div = document.createElement("div")
		document.body.appendChild(div)
		return div
	}, [])

	useMemo(() => {
		container.style.visibility = props.open ? "visible" : "hidden"
	}, [props.open])

	// Cleanup
	useLayoutEffect(() => {
		return () => {
			document.body.removeChild(container)
		}
	}, [])

	// Render the popup
	useLayoutEffect(() => {
		if (!props.anchor) return
		if (!props.open) return

		const popupDiv = (
			props.onDismiss ? container.children[1] : container.children[0]
		) as HTMLElement

		const popper = createPopper(props.anchor, popupDiv, {
			placement: props.placement || "bottom-start",
			modifiers: [
				{
					name: "offset",
					options: {
						offset: [0, 8],
					},
				},
			],
		})
		return () => {
			popper.destroy()
		}
	}, [props.anchor, props.open])

	const { onDismiss } = props

	useShortcut("escape", () => onDismiss?.())

	// Render the portal
	if (!props.open) return false
	else
		return createPortal(
			<>
				{onDismiss && (
					<div
						style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
						onClick={() => onDismiss()}
					/>
				)}
				{props.children}
			</>,
			container
		)
}

export const PopupFrame = passthroughRef((props: React.HTMLProps<HTMLDivElement>) => {
	return (
		<div
			{...props}
			className="popup"
			style={{
				background: "var(--popup-background)",
				boxShadow: "var(--shadow)",
				padding: 4,
				borderRadius: 4,
				...props.style,
			}}
		/>
	)
})
