import React, { useRef } from "react"
import { nextFocusable, prevFocusable } from "../../helpers/focusHelpers"
import { passthroughRef } from "../../helpers/passthroughRef"
import { isShortcut } from "../../hooks/useShortcut"

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
					key: i,
					selected: i === props.selectedIndex,
					onClick: () => props.onSelectIndex(i),
					onKeyDown: (e) => isShortcut("enter", e.nativeEvent) && props.onSelectIndex(i),
				})
			)}
		</div>
	)
}

export function ListBoxKeyed<T, K extends string | number>(props: {
	style?: React.CSSProperties
	items: T[]

	selectedKey: K | undefined
	onSelectKey: (key: K) => void
	getKey: (item: T) => K

	autoFocus?: boolean
	children: (item: T, props: ListItemProps, index: number) => JSX.Element
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
			{props.items.map((item, i) => {
				const key = props.getKey(item)
				return props.children(
					item,
					{
						key,
						selected: key === props.selectedKey,
						onClick: () => props.onSelectKey(key),
						onKeyDown: (e) => isShortcut("enter", e.nativeEvent) && props.onSelectKey(key),
					},
					i
				)
			})}
		</div>
	)
}

type ListItemProps = Omit<Parameters<typeof ListItem>[0], "children" | "style"> & {
	key: string | number
}

export const ListItem = passthroughRef(_ListItem)

function _ListItem(props: {
	ref?: React.Ref<HTMLDivElement>
	children: React.ReactNode
	style?: React.CSSProperties
	selected?: boolean
	onClick: React.MouseEventHandler
	onKeyDown: React.KeyboardEventHandler
}) {
	return (
		<div
			ref={props.ref}
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
