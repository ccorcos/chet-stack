import React, { useState } from "react"
import { Button } from "../components/Button"
import { Modal, ModalFrame } from "../components/Modal"
import { useWindowShortcuts } from "../hooks/useShortcut"

export function ModalDemo() {
	const [isOpen, setIsOpen] = useState(false)

	const open = () => setIsOpen(true)
	const close = () => setIsOpen(false)

	useWindowShortcuts({
		escape: close,
	})
	return (
		<div>
			<div>Modal</div>
			<Button onClick={open}>Open Modal</Button>
			{isOpen && (
				<Modal onDismiss={close}>
					<ModalFrame
						style={{ height: 200, display: "flex", justifyContent: "center", alignItems: "center" }}
					>
						Modal Content
					</ModalFrame>
				</Modal>
			)}
		</div>
	)
}
