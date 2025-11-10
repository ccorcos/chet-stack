import { nextFocusable, prevFocusable } from "client/helpers/focusHelpers"
import { useCallback } from "react"

/** Listen to the list container element, not the individual item. */
export function useKeyboardArrowFocus() {
	const onKeyDown = useCallback((event: React.KeyboardEvent) => {
		const list = event.currentTarget as HTMLElement
		if (event.key === "ArrowDown") {
			event.preventDefault()
			const next = nextFocusable(list)
			if (next) next.focus()
			return
		}

		if (event.key === "ArrowUp") {
			event.preventDefault()
			const prev = prevFocusable(list)
			if (prev) prev.focus()
			return
		}
	}, [])
	return { onKeyDown }
}
