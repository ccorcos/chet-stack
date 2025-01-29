import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import { fuzzyMatch, FuzzyMatch } from "../../../shared/fuzzyMatch"

import { isShortcut } from "../../hooks/useShortcut"
import { NakedButton } from "./Button"
import { FuzzyString } from "./FuzzyString"
import { NakedInput } from "./Input"
import { MenuItem } from "./MenuItem"
import { PopupFrame } from "./Popup"

export function SelectInput(props: {
	items: string[]
	value: string[]
	onChange: (value: string[]) => void
	onDismiss?: () => void
	autoFocus?: boolean
	notice?: React.ReactNode
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	const args = useSelectInput(props)

	useLayoutEffect(() => {
		if (props.autoFocus) inputRef.current?.focus()
	}, [])

	return (
		<PopupFrame style={{ width: 350, display: "flex", flexDirection: "column", padding: 0 }}>
			<div
				style={{
					padding: 4,
					background: "var(--background2)",
					display: "inline-flex",
					flexWrap: "wrap",
					gap: 4,
					alignItems: "center",
				}}
			>
				{props.value.map((value, i) => (
					<div key={i} style={{ ...tokenStyle, display: "flex", alignItems: "center", gap: 4 }}>
						{value}
						<NakedButton
							style={{ padding: 0, fontSize: "inherit", fontFamily: "inherit", width: "1.2em" }}
							onClick={() => props.onChange(props.value.filter((_, j) => j !== i))}
						>
							x
						</NakedButton>
					</div>
				))}
				<NakedInput
					ref={inputRef}
					{...args.inputProps}
					style={{ borderRadius: 0, padding: 0, flex: 1, minWidth: 150 }}
				/>
			</div>
			<div style={{ flex: 1, overflow: "auto", maxHeight: 300 }}>
				<SelectInputResults notice={props.notice} {...args.resultsProps} />
			</div>
		</PopupFrame>
	)
}

const tokenStyle: React.CSSProperties = {
	display: "inline-block",
	fontSize: "12px",
	padding: "2px 4px",
	borderRadius: "2px",
	backgroundColor: "var(--gray3)",
}

export function SelectInputResults(props: {
	notice?: React.ReactNode
	filteredItems: { value: string; match: FuzzyMatch }[]
	selectedIndex: number
	setSelectedIndex: (index: number) => void
	onClick: (value: string) => void
	onDismiss?: () => void
}) {
	return (
		<div>
			{props.notice}
			{props.filteredItems.map((item, i) => (
				<MenuItem
					key={i}
					selected={props.selectedIndex === i}
					onClick={() => props.onClick(item.value)}
					onMouseDown={(e) => e.preventDefault()}
					onMouseEnter={() => props.setSelectedIndex(i)}
					style={{ padding: 4, alignItems: "center", display: "flex" }}
				>
					<div style={tokenStyle}>
						<FuzzyString match={item.match} />
					</div>
				</MenuItem>
			))}
		</div>
	)
}

// This is very similar to useComboBox
function useSelectInput(props: {
	items: string[]
	value: string[]
	onChange: (value: string[]) => void
	onDismiss?: () => void
}) {
	const [text, setText] = useState("")
	const [focused, setFocused] = useState(false)
	const [selectedIndex, setSelectedIndex] = useState(0)

	const filteredItems = useMemo(() => {
		let items = props.items

		// Remove items that are already selected.
		items = items.filter((str) => !props.value.includes(str))

		// If the text is empty, show all items.
		if (text === "") return items.map((str) => ({ value: str, match: [{ skip: str }] }))

		// Fuzzy match items.
		return items
			.map((str) => ({ value: str, match: fuzzyMatch(text, str)! }))
			.filter(({ match }) => Boolean(match))
	}, [text, props.items, props.value])

	const onSubmit = (value: string) => {
		props.onChange([...props.value, value])
		setText("")
	}

	const handleKeydown = useCallback(
		(event: React.KeyboardEvent) => {
			if (isShortcut("down", event.nativeEvent)) {
				event.preventDefault()
				setSelectedIndex((i) => {
					if (i >= filteredItems.length - 1) return filteredItems.length - 1
					else return i + 1
				})
				return
			}
			if (isShortcut("up", event.nativeEvent)) {
				event.preventDefault()
				setSelectedIndex((i) => {
					if (i === 0) return i
					else return i - 1
				})
				return
			}
			if (isShortcut("enter", event.nativeEvent)) {
				event.preventDefault()
				if (filteredItems[selectedIndex]) {
					onSubmit(filteredItems[selectedIndex].value)
				}
				return
			}
			if (isShortcut("escape", event.nativeEvent)) {
				event.preventDefault()
				props.onDismiss?.()
				return
			}
			if (isShortcut("backspace", event.nativeEvent)) {
				// Only delete a selected item if we're at the beginning of the input
				const input = event.target as HTMLInputElement
				if (input.selectionStart === 0 && input.selectionEnd === 0) {
					event.preventDefault()
					props.onChange(props.value.slice(0, -1))
					return
				}
			}
		},
		[filteredItems, selectedIndex, props]
	)

	return {
		inputProps: {
			value: text,
			onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
				setText(e.target.value)
				setSelectedIndex(0)
			},
			onFocus: () => setFocused(true),
			onBlur: () => {
				setFocused(false)
				props.onDismiss?.()
			},
			onKeyDown: handleKeydown,
		},
		resultsProps: {
			filteredItems,
			selectedIndex,
			setSelectedIndex,
			onClick: onSubmit,
			onDismiss: props.onDismiss,
		},
		focused,
	}
}
