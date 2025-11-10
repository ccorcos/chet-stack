// Adapted from https://github.com/marijnh/w3c-keyname
// The shift keycode map was removed so we can use Shift as a modifier.
// For example: "Shift-]" instead of "}

import { useEffect } from "react"
import { isShortcut } from "ui/helpers/shortcut"
import { useRefCurrent } from "./useRefCurrent"

type KeyboardEventHandler = (event: KeyboardEvent) => void

// Better API:
// TODO: const {onKeyDown} = useKeyboardShortcut()
// TODO: useWindowEvent("keydown", onKeyDown)

/** Use with care. Prefer to put listeners on DOM elements to work better with focus. */
export function useShortcut(shortcut: string, fn: () => void | false) {
	const fnRef = useRefCurrent(fn)
	const shortcutRef = useRefCurrent(shortcut)

	useEffect(() => {
		const onKeydown: KeyboardEventHandler = (event) => {
			if (isShortcut(shortcutRef.current, event)) {
				const response = fnRef.current()
				if (response !== false) event.preventDefault()
			}
		}
		window.addEventListener("keydown", onKeydown)
		return () => {
			window.removeEventListener("keydown", onKeydown)
		}
	}, [])
}
