// Adapted from https://github.com/marijnh/w3c-keyname
// The shift keycode map was removed so we can use Shift as a modifier.
// For example: "Shift-]" instead of "}

import { useCallback } from "react"
import { isShortcut } from "../helpers/shortcut"
import { useRefCurrent } from "./useRefCurrent"
import { useWindowEvent } from "./useWindowEvent"

type ShortcutsArg = {
	[key: string]: undefined | null | false | (() => void)
}

export function useShortcuts(shortcuts: ShortcutsArg) {
	const shortcutsRef = useRefCurrent(shortcuts)

	const onKeyDown = useCallback((event: KeyboardEvent | React.KeyboardEvent) => {
		event = event as KeyboardEvent
		for (const [key, value] of Object.entries(shortcutsRef.current)) {
			if (!value) continue
			if (isShortcut(key, event)) {
				value()
				event.preventDefault()
				break
			}
		}
	}, [])

	return { onKeyDown }
}

/** Use with care. Prefer to put listeners on DOM elements to work better with focus. */
export function useWindowShortcuts(shortcuts: ShortcutsArg) {
	const { onKeyDown } = useShortcuts(shortcuts)
	useWindowEvent("keydown", onKeyDown)
}
