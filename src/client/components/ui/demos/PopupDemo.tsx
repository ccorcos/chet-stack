import React, { useRef, useState } from "react"
import { Button } from "../Button"
import { Popup, PopupFrame } from "../Popup"

function MiniPopup() {
	const buttonRef = useRef<HTMLButtonElement>(null)
	const [open, setOpen] = useState(false)

	return (
		<div>
			<Button ref={buttonRef} onClick={() => setOpen(true)}>
				Hello
			</Button>
			<Popup open={open} anchor={buttonRef.current} onDismiss={() => setOpen(false)}>
				<PopupFrame>This is a popup!</PopupFrame>
			</Popup>
		</div>
	)
}

export function PopupDemo() {
	return (
		<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", rowGap: "40vh" }}>
			<MiniPopup />
			<div style={{ justifySelf: "center" }}>
				<MiniPopup />
			</div>
			<div style={{ justifySelf: "end" }}>
				<MiniPopup />
			</div>
			<MiniPopup />
			<div style={{ justifySelf: "center" }}>
				<MiniPopup />
			</div>
			<div style={{ justifySelf: "end" }}>
				<MiniPopup />
			</div>
			<MiniPopup />
			<div style={{ justifySelf: "center" }}>
				<MiniPopup />
			</div>
			<div style={{ justifySelf: "end" }}>
				<MiniPopup />
			</div>
		</div>
	)
}
