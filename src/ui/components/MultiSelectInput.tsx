import React, { useLayoutEffect, useRef, useState } from "react"
import { FuzzyMatch } from "shared/fuzzyMatch"

import { useFuzzyMatch } from "../hooks/useFuzzyMatch"
import { useInputAutocomplete } from "../hooks/useInputAutocomplete"
import { NakedButton } from "./Button"
import { FuzzyString } from "./FuzzyString"
import { NakedInput } from "./Input"
import { MenuItem } from "./MenuItem"
import { PopupFrame } from "./Popup"

export function SelectInput(props: {
	items: string[]
	value: string | undefined
	onChange: (value: string | undefined) => void
	onDismiss?: () => void
	autoFocus?: boolean
	notice?: React.ReactNode
}) {
	return (
		<MultiSelectInput
			{...props}
			value={props.value === undefined ? [] : [props.value]}
			onChange={(value) => {
				if (value.length === 0) return props.onChange(undefined)
				if (value.length === 1) return props.onChange(value[0])
				const newValue = value.filter((v) => v !== props.value)[0]
				props.onChange(newValue)
			}}
		/>
	)
}

export function MultiSelectInput(props: {
	items: string[]
	value: string[]
	onChange: (value: string[]) => void
	onDismiss?: () => void
	autoFocus?: boolean
	notice?: React.ReactNode
}) {
	const inputRef = useRef<HTMLInputElement>(null)

	const args = useSelectInput({
		...props,
		onChange: (value) => {
			props.onChange(value)
			// Refocus the input after clicking an item.
			inputRef.current?.focus()
		},
	})

	useLayoutEffect(() => {
		if (props.autoFocus) inputRef.current?.focus()
	}, [])

	return (
		<PopupFrame style={{ width: 350, display: "flex", flexDirection: "column", padding: 0 }}>
			<div
				className="layer"
				style={{
					padding: 4,
					display: "inline-flex",
					flexWrap: "wrap",
					gap: 4,
					alignItems: "center",
				}}
			>
				{props.value.map((value, i) => (
					<div
						key={i}
						className="layer"
						style={{ ...tokenStyle, display: "flex", alignItems: "center", gap: 4 }}
					>
						{value}
						<NakedButton
							style={{ padding: 0, fontSize: "inherit", fontFamily: "inherit", width: 22 }}
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

export const tokenStyle: React.CSSProperties = {
	display: "inline-block",
	fontSize: "12px",
	padding: "2px 4px",
	borderRadius: "2px",
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
					<div style={tokenStyle} className="layer">
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
	const [selectedIndex, setSelectedIndex] = useState(0)

	const filteredItems = useFuzzyMatch({
		items: props.items,
		without: props.value,
		filter: text,
	})

	const onSubmit = (value: string) => {
		props.onChange([...props.value, value])
		setText("")
	}

	const { onKeyDown } = useInputAutocomplete({
		selectedIndex,
		setSelectedIndex,
		items: filteredItems,
		onSubmit: ({ value }) => onSubmit(value),
		onBackspace: () => props.onChange(props.value.slice(0, -1)),
		onDismiss: props.onDismiss,
	})

	return {
		inputProps: {
			value: text,
			onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
				setText(e.target.value)
				setSelectedIndex(0)
			},
			onKeyDown,
		},
		resultsProps: {
			filteredItems,
			selectedIndex,
			setSelectedIndex,
			onClick: onSubmit,
			onDismiss: props.onDismiss,
		},
	}
}
