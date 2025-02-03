import { useCallback } from "react"
import { nextFocusable, prevFocusable } from "../helpers/focusHelpers"

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
