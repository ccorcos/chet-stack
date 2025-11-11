import React from "react"
import { createPortal } from "react-dom"
import { usePortal } from "ui/hooks/usePortal"
import { PopupFrame } from "./Popup"

export function Modal(props: { children: React.ReactNode; onDismiss: () => void }) {
	const div = usePortal()
	const width = 540
	return createPortal(
		<>
			<div
				style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
				onClick={props.onDismiss}
			/>
			<div style={{ position: "fixed", top: 55, width, right: `calc(50vw - ${width / 2}px)` }}>
				{props.children}
			</div>
		</>,
		div
	)
}

export function ModalFrame(props: React.HTMLProps<HTMLDivElement>) {
	return <PopupFrame {...props} />
}
