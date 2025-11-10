import { useCallback } from "react"
import { isShortcut } from "./useShortcut"

/** Handle keyboard select for list of items. */
export function useInputAutocomplete<T>(props: {
	selectedIndex: number
	setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
	items: T[]
	onSubmit: (item: T) => void
	onBackspace?: () => void
	onDismiss?: () => void
}) {
	const { items, onSubmit, onBackspace, onDismiss, selectedIndex, setSelectedIndex } = props

	const handleKeydown = useCallback(
		(event: React.KeyboardEvent) => {
			if (isShortcut("down", event.nativeEvent)) {
				event.preventDefault()
				setSelectedIndex((i) => {
					if (i >= items.length - 1) return items.length - 1
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
				if (items[selectedIndex]) {
					onSubmit(items[selectedIndex])
					setSelectedIndex(0)
				}
				return
			}
			if (onDismiss && isShortcut("escape", event.nativeEvent)) {
				event.preventDefault()
				onDismiss()
				setSelectedIndex(0)
				return
			}
			if (isShortcut("backspace", event.nativeEvent)) {
				// Only delete a selected item if we're at the beginning of the input
				const input = event.target as HTMLInputElement
				if (onBackspace && input.selectionStart === 0 && input.selectionEnd === 0) {
					event.preventDefault()
					onBackspace()
					return
				}
			}
		},
		[items, onSubmit, onBackspace, onDismiss, selectedIndex]
	)

	return {
		onKeyDown: handleKeydown,
	}
}
