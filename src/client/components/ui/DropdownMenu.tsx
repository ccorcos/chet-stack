import React, { useLayoutEffect, useRef, useState } from "react"
import { isShortcut } from "../../hooks/useShortcut"
import { MenuItem } from "./MenuItem"
import { PopupFrame } from "./Popup"

/* This is meant to be inside a <Popup>. It will focus as soon as it mounts. It's children should be <MenuItem>.*/
export function DropdownMenu(props: { style?: React.CSSProperties; children: JSX.Element[] }) {
	const menuRef = useRef<HTMLDivElement>(null)

	// Focus immediately.
	useLayoutEffect(() => {
		if (!menuRef.current) throw new Error("didnt work")
		menuRef.current.focus()
	}, [])

	const [selectedIndex, setSelectedIndex] = useState(0)

	let count = 0
	const children = React.Children.toArray(props.children).map((elm, i) => {
		if (typeof elm !== "object") return elm
		if (!("type" in elm)) return elm
		if (elm.type !== MenuItem) return elm
		count += 1
		return React.cloneElement(elm, {
			selected: i === selectedIndex,
			onMouseEnter: () => setSelectedIndex(i),
		})
	})

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (isShortcut("down", event.nativeEvent)) {
			event.preventDefault()
			return setSelectedIndex((i) => {
				if (i === count - 1) return i
				else return i + 1
			})
		}
		if (isShortcut("up", event.nativeEvent)) {
			event.preventDefault()
			return setSelectedIndex((i) => {
				if (i === 0) return i
				else return i - 1
			})
		}
		// Simulate focused where enter triggers a click.
		if (isShortcut("enter", event.nativeEvent)) {
			event.preventDefault()
			let i = 0
			for (const elm of children) {
				if (typeof elm !== "object") continue
				if (!("type" in elm)) continue
				if (elm.type !== MenuItem) continue
				if (i === selectedIndex) return elm.props.onClick?.(event)
				else i += 1
			}
		}
	}

	return (
		<PopupFrame ref={menuRef} tabIndex={-1} onKeyDown={handleKeyDown} style={props.style}>
			{children}
		</PopupFrame>
	)
}
