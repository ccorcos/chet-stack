import React, { useState } from "react"
import { CommandPrompt } from "ui/components/CommandPrompt"
import { Modal } from "ui/components/Modal"
import { useCommand } from "../hooks/useCommand"
import { useClientEnvironment } from "../services/ClientEnvironment"

export function Commander() {
	const [isOpen, setIsOpen] = useState(false)

	useCommand({
		name: "Open Commander",
		shortcut: "cmd-shift-p",
		hidden: true,
		enabled: () => !isOpen,
		execute: () => setIsOpen(true),
	})

	useCommand({
		name: "Close Commander",
		shortcut: "escape",
		hidden: true,
		enabled: () => isOpen,
		execute: () => setIsOpen(false),
	})

	const { cmd } = useClientEnvironment()
	if (!isOpen) return false

	return (
		<Modal onDismiss={() => setIsOpen(false)}>
			<CommandPrompt
				commands={cmd.list().filter((c) => !c.hidden)}
				onSubmit={(command) => {
					command.execute()
					setIsOpen(false)
				}}
			/>
		</Modal>
	)
}
