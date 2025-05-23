import React, { useState } from "react"
import { useShortcut } from "../../../hooks/useShortcut"
import { CommandPrompt, CommandPromptOverlay } from "../CommandPrompt"

export function CommandPromptDemo() {
	const [isOpen, setIsOpen] = useState(false)
	useShortcut("cmd-shift-p", () => {
		setIsOpen(true)
	})
	useShortcut("escape", () => setIsOpen(false))

	if (!isOpen) return false

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
