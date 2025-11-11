import React, { useState } from "react"
import { AutocompletePrompt } from "ui/components/AutocompletePrompt"
import { Modal } from "ui/components/Modal"
import { Shortcut } from "ui/components/Shortcut"
import { useCommand } from "../hooks/useCommand"
import { useClientEnvironment } from "../services/ClientEnvironment"

export function CommandPrompt() {
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
			<AutocompletePrompt
				items={cmd.list().filter((c) => !c.hidden)}
				onSubmit={(command) => {
					command.execute()
					setIsOpen(false)
				}}
				render={({ item, children }) => (
					<>
						<div style={{ display: "flex", flex: 1 }}>{children}</div>
						<Shortcut shortcut={item.shortcut} />
					</>
				)}
			/>
		</Modal>
	)
}
