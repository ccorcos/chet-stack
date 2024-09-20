import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { FuzzyMatch, fuzzyMatch } from "../../../shared/fuzzyMatch"
import { useRefPrevious } from "../../hooks/useRefPrevious"
import { isShortcut } from "../../hooks/useShortcut"
import { Button } from "./Button"
import { FuzzyString } from "./FuzzyString"
import { Input } from "./Input"
import { MenuItem } from "./MenuItem"
import { Popup, PopupFrame } from "./Popup"

export function ComboBoxSelect(props: {
	items: string[]
	placeholder: string
	value: string | undefined
	onChange: (value: string) => void
	Input?: React.FC<JSX.IntrinsicElements["input"]>
	Button?: React.FC<JSX.IntrinsicElements["button"]>
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
				Input={props.Input}
			/>
		)
	} else {
		const ComboButton = props.Button ?? Button
		return (
			<ComboButton ref={buttonRef} onClick={() => setOpen(true)} style={{ textAlign: "left" }}>
				{props.value || <span style={{ color: "var(--text-color2" }}>{props.placeholder} </span>}{" "}
				<span style={{ fontSize: "0.7rem", verticalAlign: "middle" }}>▼</span>
			</ComboButton>
		)
	}
}

export function useComboBox(props: {
	items: string[]
	value: string | undefined
	onChange: (value: string) => void
	onDismiss?: () => void
}) {
	const [text, setText] = useState("")
	const [focused, setFocused] = useState(false)
	const [selectedIndex, setSelectedIndex] = useState(0)

	const filteredItems = useMemo(() => {
		if (text === "") return props.items.map((str) => ({ value: str, match: [{ skip: str }] }))

		return props.items
			.map((str) => ({ value: str, match: fuzzyMatch(text, str)! }))
			.filter(({ match }) => Boolean(match))
	}, [text, props.items])

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
					props.onChange(filteredItems[selectedIndex].value)
				}
				return
			}
			if (isShortcut("escape", event.nativeEvent)) {
				event.preventDefault()
				props.onDismiss?.()
				return
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
			onChange: props.onChange,
			onDismiss: props.onDismiss,
		},
		focused,
	}
}

export function ComboBox(props: {
	items: string[]
	value: string | undefined
	onChange: (value: string) => void
	onDismiss?: () => void
	autoFocus?: boolean
	notice?: React.ReactNode
	Input?: React.FC<JSX.IntrinsicElements["input"]>
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	const args = useComboBox(props)

	useEffect(() => {
		if (props.autoFocus) inputRef.current?.focus()
	}, [props.autoFocus])

	const ComboInput = props.Input ?? Input
	return (
		<>
			<ComboInput ref={inputRef} {...args.inputProps} />
			<Popup
				open={args.focused && args.resultsProps.filteredItems.length > 0}
				anchor={inputRef.current}
				onDismiss={props.onDismiss}
			>
				<PopupFrame>
					<ComboBoxResults notice={props.notice} {...args.resultsProps} />
				</PopupFrame>
			</Popup>
		</>
	)
}

export function ComboBoxResults(props: {
	notice?: React.ReactNode
	filteredItems: { value: string; match: FuzzyMatch }[]
	selectedIndex: number
	setSelectedIndex: (index: number) => void
	onChange: (value: string) => void
	onDismiss?: () => void
}) {
	return (
		<>
			{props.notice}
			{props.filteredItems.map((item, i) => (
				<MenuItem
					key={i}
					selected={props.selectedIndex === i}
					onClick={() => props.onChange(item.value)}
					onMouseDown={(e) => e.preventDefault()}
					onMouseEnter={() => props.setSelectedIndex(i)}
				>
					<FuzzyString match={item.match} />
				</MenuItem>
			))}
		</>
	)
}
