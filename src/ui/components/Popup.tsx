import { Placement, createPopper } from "@popperjs/core"
import React, { useLayoutEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { usePortal } from "ui/hooks/usePortal"
import { useShortcut } from "../hooks/useShortcut"

// TODO: can we get rid of these?
const dismissZIndex = undefined // 99
const overlayZIndex = undefined //100

export function Popup(props: {
	open: boolean
	anchor: HTMLElement | undefined | null
	offset?: [number, number]
	placement?: Placement
	children?: React.ReactNode
	onDismiss?: () => void
}) {
	// Create the overlay div.
	const div = usePortal()

	useMemo(() => {
		div.style.visibility = props.open ? "visible" : "hidden"
	}, [props.open])

	// Render the popup
	useLayoutEffect(() => {
		if (!props.anchor) return
		if (!props.open) return

		const popupDiv = (props.onDismiss ? div.children[1] : div.children[0]) as HTMLElement

		const popper = createPopper(props.anchor, popupDiv, {
			placement: props.placement || "bottom-start",
			modifiers: [
				{
					name: "offset",
					options: {
						offset: props.offset || [0, 2],
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
						style={{
							position: "fixed",
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							zIndex: dismissZIndex,
						}}
						onClick={() => onDismiss()}
					/>
				)}
				{props.children}
			</>,
			div
		)
}

export function PopupFrame(props: React.HTMLProps<HTMLDivElement>) {
	return (
		<div
			{...props}
			className="layer"
			style={{
				boxShadow: "var(--shadow)",
				padding: 4,
				borderRadius: 4,
				zIndex: overlayZIndex,
				...props.style,
			}}
		/>
	)
}
