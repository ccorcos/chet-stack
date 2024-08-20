import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { fuzzyMatch } from "../../../shared/fuzzyMatch"
import { useRefPrevious } from "../../hooks/useRefPrevious"
import { isShortcut } from "../../hooks/useShortcut"
import { FuzzyString } from "../FuzzyString"
import { Button } from "./Button"
import { Input } from "./Input"
import { MenuItem } from "./MenuItem"
import { Popup, PopupFrame } from "./Popup"

export function ComboBoxSelect(props: {
	items: string[]
	placeholder: string
	value: string | undefined
	onChange: (value: string) => void
}) {
	const [open, setOpen] = useState(false)

	const buttonRef = useRef<HTMLButtonElement>(null)

	const prevOpen = useRefPrevious(open)
	useLayoutEffect(() => {
		if (prevOpen.current && !open) {
			buttonRef.current?.focus()
		}
	}, [open])

	if (open) {
		return (
			<ComboBox
				autoFocus
				items={props.items}
				value={props.value}
				onChange={(newValue) => {
					props.onChange(newValue)
					setOpen(false)
				}}
				onDismiss={() => {
					console.log("DIsmiss")
					setOpen(false)
				}}
			/>
		)
	} else {
		return (
			<Button ref={buttonRef} onClick={() => setOpen(true)}>
				{props.value || <span style={{ color: "var(--text-color2" }}>{props.placeholder} </span>}{" "}
				<span style={{ fontSize: "0.7rem", verticalAlign: "middle" }}>▼</span>
			</Button>
		)
	}
}

export function ComboBox(props: {
	items: string[]
	value: string | undefined
	onChange: (value: string) => void
	onDismiss?: () => void
	autoFocus?: boolean
	notice?: React.ReactNode
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	const [focused, setFocused] = useState(false)

	useEffect(() => {
		if (props.autoFocus) inputRef.current?.focus()
	}, [])

	const [text, setText] = useState("")

	const filteredItems = useMemo(() => {
		return props.items
			.map((str) => ({ value: str, match: fuzzyMatch(text, str)! }))
			.filter(({ match }) => Boolean(match))
	}, [text])

	const [selectedIndex, setSelectedIndex] = useState(0)

	const handleKeydown = (event: React.KeyboardEvent) => {
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
				props.onChange(filteredItems[selectedIndex].value)
			}
			return
		}
		if (isShortcut("escape", event.nativeEvent)) {
			event.preventDefault()
			props.onDismiss?.()
			return
		}
	}

	// TODO: filter selected on key change to maintain selectedIndex position?
	return (
		<div>
			<Input
				ref={inputRef}
				onFocus={() => setFocused(true)}
				onBlur={() => {
					setFocused(false)
					props.onDismiss?.()
				}}
				value={text}
				onChange={(e) => {
					setText(e.target.value)
					setSelectedIndex(0)
				}}
				onKeyDown={handleKeydown}
			/>

			<Popup
				open={focused && filteredItems.length > 0}
				anchor={inputRef.current}
				onDismiss={props.onDismiss}
			>
				<PopupFrame>
					{props.notice}
					{filteredItems.map((item, i) => (
						<MenuItem
							selected={selectedIndex === i}
							onClick={() => props.onChange(item.value)}
							onMouseDown={(e) => e.preventDefault()}
							onMouseEnter={() => setSelectedIndex(i)}
						>
							<FuzzyString match={item.match} />
						</MenuItem>
					))}
				</PopupFrame>
			</Popup>
		</div>
	)
}
