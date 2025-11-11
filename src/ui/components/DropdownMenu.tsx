import React, { useLayoutEffect, useRef, useState } from "react"
import { useShortcuts } from "../hooks/useShortcut"
import { MenuItem } from "./MenuItem"
import { PopupFrame } from "./Popup"

/* This is meant to be inside a <Popup>. It will focus as soon as it mounts. It's children should be <MenuItem>.*/
export function DropdownMenu(props: {
	style?: React.CSSProperties
	children: React.JSX.Element[]
}) {
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
		} as any)
	})

	const { onKeyDown } = useShortcuts({
		down: () => {
			setSelectedIndex((i) => {
				if (i === count - 1) return i
				else return i + 1
			})
		},
		up: () => {
			setSelectedIndex((i) => {
				if (i === 0) return i
				else return i - 1
			})
		},
		enter: () => {
			let i = 0
			for (const elm of children) {
				if (typeof elm !== "object") continue
				if (!("type" in elm)) continue
				if (elm.type !== MenuItem) continue
				if (i === selectedIndex) {
					;(elm.props as any).onClick?.()
					return
				}
				i += 1
			}
		},
	})

	return (
		<PopupFrame ref={menuRef} tabIndex={-1} onKeyDown={onKeyDown} style={props.style}>
			{children}
		</PopupFrame>
	)
}
