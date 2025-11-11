import React, { useLayoutEffect, useRef, useState } from "react"
import { useClampedState } from "../hooks/useClampedState"
import { useFuzzyMatch } from "../hooks/useFuzzyMatch"
import { useInputAutocomplete } from "../hooks/useInputAutocomplete"
import { useKeyboardMode } from "../hooks/useKeyboardMode"
import { FuzzyString } from "./FuzzyString"
import { Input } from "./Input"
import { MenuItem } from "./MenuItem"

export function AutocompletePrompt<T extends { name: string }>(props: {
	items: T[]
	onSubmit: (command: T) => void
	render?: (props: { item: T; children: React.ReactNode }) => React.ReactNode
}) {
	const input = useRef<HTMLInputElement>(null)
	useLayoutEffect(() => {
		input.current?.focus()
	}, [])

	const [searchText, setSearchText] = useState("")

	const filteredItems = useFuzzyMatch({
		items: props.items,
		text: (item) => item.name,
		query: searchText,
	})

	const onSubmit = (item: T) => {
		setSearchText("")
		props.onSubmit(item)
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
		<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
						{props.render ? (
							props.render({ item: command, children: <FuzzyString match={match} /> })
						) : (
							<div style={{ flex: 1 }}>
								<FuzzyString match={match} />
							</div>
						)}
					</MenuItem>
				))}
			</div>
		</div>
	)
}
