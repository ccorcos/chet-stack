import type { Command } from "client/services/Command"
import React, { useLayoutEffect, useRef, useState } from "react"
import { displayShortcut } from "../helpers/shortcut"
import { useClampedState } from "../hooks/useClampedState"
import { useFuzzyMatch2 } from "../hooks/useFuzzyMatch"
import { useInputAutocomplete } from "../hooks/useInputAutocomplete"
import { useKeyboardMode } from "../hooks/useKeyboardMode"
import { FuzzyString } from "./FuzzyString"
import { Input } from "./Input"
import { MenuItem } from "./MenuItem"
import { PopupFrame } from "./Popup"

export function CommandPrompt(props: {
	commands: Command[]
	onSubmit: (command: Command) => void
}) {
	const input = useRef<HTMLInputElement>(null)
	useLayoutEffect(() => {
		input.current?.focus()
	}, [])

	const [searchText, setSearchText] = useState("")
	const filteredItems = useFuzzyMatch2({
		items: props.commands,
		text: (c) => c.name,
		query: searchText,
	})

	const onSubmit = (command: Command) => {
		setSearchText("")
		props.onSubmit(command)
	}

	const [selectedIndex, setSelectedIndex] = useClampedState(0, [0, filteredItems.length - 1])

	const { onKeyDown } = useInputAutocomplete({
		selectedIndex,
		setSelectedIndex,
		items: filteredItems,
		onSubmit: ({ value }) => onSubmit(value),
	})

	const keyboardMode = useKeyboardMode()

	return (
		<PopupFrame style={{ display: "flex", flexDirection: "column", gap: 4 }}>
			<Input
				ref={input}
				type="search"
				style={{}}
				placeholder="Search..."
				value={searchText}
				onChange={(e) => setSearchText(e.target.value)}
				onKeyDown={onKeyDown}
			/>
			<div>
				{filteredItems.map(({ value: command, match }, i) => (
					<MenuItem
						key={command.name}
						selected={selectedIndex === i}
						onClick={() => onSubmit(command)}
						onMouseDown={(e) => e.preventDefault()}
						onMouseEnter={() => {
							if (!keyboardMode) setSelectedIndex(i)
						}}
						style={{
							padding: 8,
							backgroundColor: selectedIndex === i ? "var(--accent0)" : undefined,
							display: "flex",
							gap: 8,
						}}
					>
						<div style={{ flex: 1 }}>
							<FuzzyString match={match} />
						</div>
						<Shortcut shortcuts={command.shortcut} />
					</MenuItem>
				))}
			</div>
		</PopupFrame>
	)
}

function Shortcut(props: { shortcuts: undefined | string | string[] }) {
	const { shortcuts } = props
	if (!shortcuts) return false
	if (typeof shortcuts === "string") return <Token>{displayShortcut(shortcuts)}</Token>
	return (
		<div style={{ display: "flex", gap: 4 }}>
			{shortcuts.map((s) => (
				<Token>{displayShortcut(s)}</Token>
			))}
		</div>
	)
}

function Token(props: { children: React.ReactNode }) {
	return (
		<span
			style={{
				background: "var(--bg2)",
				color: "var(--fg2)",
				fontSize: 12,
				padding: "2px 4px",
				borderRadius: 4,
				alignSelf: "center",
			}}
		>
			{props.children}
		</span>
	)
}
