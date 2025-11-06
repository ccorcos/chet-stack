import React, { useRef, useState } from "react"
import { Button } from "../components/Button"
import { DropdownMenu } from "../components/DropdownMenu"
import { MenuItem } from "../components/MenuItem"
import { Popup } from "../components/Popup"

export function DropdownDemo() {
	const buttonRef = useRef<HTMLButtonElement>(null)
	const [open, setOpen] = useState(false)

	const handleDismiss = () => {
		setOpen(false)
		buttonRef.current?.focus()
	}

	return (
		<div>
			<Button ref={buttonRef} onClick={() => setOpen(true)}>
				Hello
			</Button>
			<Popup open={open} anchor={buttonRef.current} onDismiss={handleDismiss}>
				<DropdownMenu style={{ minWidth: 120 }}>
					<MenuItem
						onClick={() => {
							console.log("Item 1")
							handleDismiss()
						}}
					>
						Item 1
					</MenuItem>
					<MenuItem
						onClick={() => {
							console.log("Item 2")
							handleDismiss()
						}}
					>
						Item 2
					</MenuItem>
					<MenuItem
						onClick={() => {
							console.log("Item 3")
							handleDismiss()
						}}
					>
						Item 3
					</MenuItem>
					<MenuItem
						onClick={() => {
							console.log("Item 4")
							handleDismiss()
						}}
					>
						Item 4
					</MenuItem>
				</DropdownMenu>
			</Popup>
		</div>
	)
}
