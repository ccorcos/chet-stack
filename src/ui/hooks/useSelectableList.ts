import { isEqual } from "lodash-es"
import { useCallback, useRef } from "react"
import { isShortcut } from "../helpers/shortcut"
import { useRefCurrent } from "./useRefCurrent"

/** Listen to the list container element, not the individual items. */
export function useSelectableList<T>(args: {
	list: T[]
	selected: T[]
	setSelected: (key: T[]) => void
	multiselect?: boolean
}) {
	// Assumes data-key="element" on each element.

	const listRef = useRefCurrent(args.list)
	const selectedRef = useRefCurrent(args.selected)
	const prevClickRef = useRef<T | undefined>()

	const shiftSelect = (key: T) => {
		if (!args.multiselect) return
		const setSelected = args.setSelected

		const selected = selectedRef.current
		const list = listRef.current
		const index = list.findIndex((item) => isEqual(item, key))
		if (index === -1) throw new Error("Clicked item not found.")

		const prevIndex =
			prevClickRef.current === undefined
				? index
				: list.findIndex((item) => isEqual(item, prevClickRef.current))
		if (index === -1) throw new Error("Prev clicked item not found.")

		const [start, end] = [index, prevIndex].sort((a, b) => a - b)

		const newSelected = [...selected]
		for (let i = start; i <= end; i++) {
			newSelected.push(list[i])
		}
		setSelected(newSelected)
		prevClickRef.current = key
	}

	const metaSelect = (key: T) => {
		if (!args.multiselect) return
		const setSelected = args.setSelected

		const selected = selectedRef.current
		const newSelected = [...selected]
		const existingIndex = newSelected.findIndex((item) => isEqual(item, key))
		if (existingIndex !== -1) {
			newSelected.splice(existingIndex, 1)
		} else {
			newSelected.push(key)
		}
		setSelected(newSelected)
		prevClickRef.current = key
	}

	const normalSelect = (key: T) => {
		const setSelected = args.setSelected
		const newSelected = [key]
		setSelected(newSelected)
		prevClickRef.current = key
	}

	const onClick = useCallback((event: React.MouseEvent) => {
		const element = (event.target as HTMLElement).closest("[data-selectable]")
		if (!element) return
		const key = (element as any)._selectable as T

		if (args.multiselect && event.shiftKey) return shiftSelect(key)
		if (args.multiselect && (event.metaKey || event.ctrlKey)) return metaSelect(key)
		normalSelect(key)
	}, [])

	const onKeyDown = useCallback((event: React.KeyboardEvent) => {
		// This works only if the item is focused from the keyboard
		const key = (event.target as any)._selectable as T
		if (key === undefined) return

		if (args.multiselect && isShortcut("shift-enter", event.nativeEvent)) {
			event.preventDefault()
			return shiftSelect(key)
		}

		if (args.multiselect && isShortcut("meta-enter", event.nativeEvent)) {
			event.preventDefault()
			return metaSelect(key)
		}

		if (event.key === "Enter") {
			event.preventDefault()
			return normalSelect(key)
		}

		if (isShortcut("escape", event.nativeEvent)) {
			event.preventDefault()
			return args.setSelected([])
		}
	}, [])

	return { onClick, onKeyDown }
}
