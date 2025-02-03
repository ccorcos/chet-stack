import { useCallback, useRef } from "react"
import { useRefCurrent } from "./useRefCurrent"
import { isShortcut } from "./useShortcut"

export function useSelectableList(args: {
	list: string[]
	selected: Set<string>
	setSelected: (keys: Set<string>) => void
	multiselect?: boolean
}) {
	// Assumes data-key="element" on each element.
	// const [selected, setSelected] = useState(new Set<string>())

	const listRef = useRefCurrent(args.list)
	const selectedRef = useRefCurrent(args.selected)
	const setSelected = args.setSelected

	const prevClickRef = useRef<string | undefined>()

	const shiftSelect = (key: string) => {
		const selected = selectedRef.current
		const list = listRef.current
		const index = list.indexOf(key)
		if (index === -1) throw new Error("Clicked item not found.")

		const prevIndex =
			prevClickRef.current === undefined ? index : list.indexOf(prevClickRef.current)
		if (index === -1) throw new Error("Prev clicked item not found.")

		const [start, end] = [index, prevIndex].sort((a, b) => a - b)

		const newSelected = new Set<string>(selected)
		for (let i = start; i <= end; i++) {
			newSelected.add(list[i])
		}
		setSelected(newSelected)
		prevClickRef.current = key
	}

	const metaSelect = (key: string) => {
		const selected = selectedRef.current
		const newSelected = new Set<string>(selected)
		if (newSelected.has(key)) {
			newSelected.delete(key)
		} else {
			newSelected.add(key)
		}
		setSelected(newSelected)
		prevClickRef.current = key
	}

	const normalSelect = (key: string) => {
		const newSelected = new Set<string>()
		newSelected.add(key)
		setSelected(newSelected)
		prevClickRef.current = key
	}

	const onClick = useCallback((event: React.MouseEvent) => {
		const element = (event.target as HTMLElement).closest("[data-key]")
		if (!element) return
		const key = element.getAttribute("data-key")!

		if (args.multiselect && event.shiftKey) return shiftSelect(key)
		if (args.multiselect && (event.metaKey || event.ctrlKey)) return metaSelect(key)
		normalSelect(key)
	}, [])

	const onKeyDown = useCallback((event: React.KeyboardEvent) => {
		// This works only if the item is focused from the keyboard
		const key = (event.target as HTMLElement).getAttribute("data-key")
		if (key === undefined || key === null) return

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
			return setSelected(new Set<string>())
		}
	}, [])

	return { onClick, onKeyDown }
}
