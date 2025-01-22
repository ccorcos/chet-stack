import React, { useLayoutEffect, useRef } from "react"
import { FuzzyMatch } from "../../../shared/fuzzyMatch"
import { useComboBox } from "./ComboBox"
import { FuzzyString } from "./FuzzyString"
import { NakedInput } from "./Input"
import { MenuItem } from "./MenuItem"
import { Popup, PopupFrame } from "./Popup"

export function SelectInput(props: {
	items: string[]
	value: string | undefined
	onChange: (value: string) => void
	onDismiss?: () => void
	autoFocus?: boolean
	notice?: React.ReactNode
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	const args = useComboBox(props)

	useLayoutEffect(() => {
		if (props.autoFocus) inputRef.current?.focus()
	}, [])

	return (
		<>
			<NakedInput ref={inputRef} {...args.inputProps} />
			<Popup
				open={args.focused && args.resultsProps.filteredItems.length > 0}
				anchor={inputRef.current}
				onDismiss={props.onDismiss}
			>
				<PopupFrame>
					<SelectInputResults notice={props.notice} {...args.resultsProps} />
				</PopupFrame>
			</Popup>
		</>
	)
}

const tokenStyle: React.CSSProperties = {
	display: "inline-block",
	fontSize: "12px",
	padding: "2px 8px",
	borderRadius: "2px",
	backgroundColor: "var(--gray3)",
}

export function SelectInputResults(props: {
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
					<div style={tokenStyle}>
						<FuzzyString match={item.match} />
					</div>
				</MenuItem>
			))}
		</>
	)
}
