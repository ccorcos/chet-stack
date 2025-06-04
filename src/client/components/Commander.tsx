import React, { useState } from "react"
import { useCommand } from "../hooks/useCommand"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { CommandPrompt, CommandPromptOverlay } from "./ui/CommandPrompt"

export function Commander() {
	const [isOpen, setIsOpen] = useState(false)

	useCommand({
		name: "Open Commander",
		shortcut: "cmd-shift-p",
		enabled: () => !isOpen,
		execute: () => setIsOpen(true),
	})

	useCommand({
		name: "Close Commander",
		shortcut: "escape",
		enabled: () => isOpen,
		execute: () => setIsOpen(false),
	})

	const { cmd } = useClientEnvironment()
	if (!isOpen) return false

	return (
		<CommandPromptOverlay onDismiss={() => setIsOpen(false)}>
			<CommandPrompt
				commands={cmd.list()}
				onSubmit={(command) => {
					command.execute()
					setIsOpen(false)
				}}
			/>
		</CommandPromptOverlay>
	)
}
