import React, { useState } from "react"
import { Button } from "../components/Button"
import { CommandPrompt, CommandPromptOverlay } from "../components/CommandPrompt"

export function CommandPromptDemo() {
	const [isOpen, setIsOpen] = useState(false)
	// useShortcut("cmd-shift-p", () => {
	// 	setIsOpen(true)
	// })
	// useShortcut("escape", () => setIsOpen(false))

	if (!isOpen)
		return (
			<div style={{ padding: 8 }}>
				<Button onClick={() => setIsOpen(true)}>Open</Button>
			</div>
		)
	return (
		<CommandPromptOverlay onDismiss={() => setIsOpen(false)}>
			<CommandPrompt
				commands={[
					{
						name: "hello",
						execute: () => {
							alert("hello")
						},
					},
					{
						name: "world",
						execute: () => {
							alert("world")
						},
					},
				]}
				onSubmit={(command) => {
					command.execute()
					setIsOpen(false)
				}}
			/>
		</CommandPromptOverlay>
	)
}
