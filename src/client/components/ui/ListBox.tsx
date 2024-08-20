import React, { useRef } from "react"
import { nextFocusable, prevFocusable } from "../../helpers/focusHelpers"
import { isShortcut } from "../../hooks/useShortcut"

/**
 * Inspired by React-Aria: https://react-spectrum.adobe.com/react-aria/ComboBox.html
 */
//
export function ListBox<T>(props: {
	style?: React.CSSProperties
	items: T[]

	selectedIndex: number | undefined
	onSelectIndex: (index: number) => void

	autoFocus?: boolean

	children: (item: T, props: ListItemProps) => JSX.Element
}) {
	const list = useRef<HTMLDivElement>(null)

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (isShortcut("down", event.nativeEvent)) {
			event.preventDefault()
			const next = nextFocusable(list.current!)
			if (next) next.focus()
			return
		}

		if (isShortcut("up", event.nativeEvent)) {
			event.preventDefault()
			const prev = prevFocusable(list.current!)
			if (prev) prev.focus()
			return
		}
	}

	return (
		<div ref={list} style={props.style} role="listbox" tabIndex={0} onKeyDown={handleKeyDown}>
			{props.items.map((item, i) =>
				props.children(item, {
					selected: i === props.selectedIndex,
					onClick: () => props.onSelectIndex(i),
					onKeyDown: (e) => isShortcut("enter", e.nativeEvent) && props.onSelectIndex(i),
				})
			)}
		</div>
	)
}

type ListItemProps = Omit<Parameters<typeof ListItem>[0], "children" | "style">

export function ListItem(props: {
	children: React.ReactNode
	style?: React.CSSProperties
	selected?: boolean
	onClick: React.MouseEventHandler
	onKeyDown: React.KeyboardEventHandler
}) {
	const div = useRef<HTMLDivElement>(null)

	return (
		<div
			ref={div}
			role="listitem"
			tabIndex={-1}
			className="feedback"
			style={{
				background: props.selected ? "var(--blue)" : undefined,
				cursor: "pointer",
				...props.style,
			}}
			onClick={props.onClick}
			onKeyDown={props.onKeyDown}
		>
			{props.children}
		</div>
	)
}
