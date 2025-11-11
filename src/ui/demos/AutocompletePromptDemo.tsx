import React, { useState } from "react"
import { AutocompletePrompt } from "ui/components/AutocompletePrompt"
import { Shortcut } from "ui/components/Shortcut"
import { useWindowShortcuts } from "ui/hooks/useShortcut"
import { Button } from "../components/Button"
import { Modal, ModalFrame } from "../components/Modal"

type Command = {
	name: string
	shortcut?: string | string[]
	execute: () => void
}

const commands: Command[] = [
	{
		name: "hello",
		shortcut: "cmd-h",
		execute: () => {
			alert("hello")
		},
	},
	{
		name: "blue",
		execute: () => {
			alert(" blue")
		},
	},
	{
		name: "world",
		shortcut: ["cmd-w", "cmd-shift-w"],
		execute: () => {
			alert("world")
		},
	},
]

export function AutocompletePromptDemo() {
	const [isOpen, setIsOpen] = useState(false)
	const open = () => setIsOpen(true)
	const close = () => setIsOpen(false)

	useWindowShortcuts({
		"cmd-shift-p": open,
		escape: close,
	})

	if (!isOpen) {
		return (
			<div style={{ padding: 8 }}>
				<Button onClick={open}>Open</Button>
			</div>
		)
	}

	return (
		<Modal onDismiss={close}>
			<ModalFrame>
				<AutocompletePrompt
					items={commands}
					onSubmit={(command) => {
						command.execute()
						close()
					}}
					render={({ item, children }) => (
						<>
							<div style={{ display: "flex", flex: 1 }}>{children}</div>
							<Shortcut shortcut={item.shortcut} />
						</>
					)}
				/>
			</ModalFrame>
		</Modal>
	)
}
