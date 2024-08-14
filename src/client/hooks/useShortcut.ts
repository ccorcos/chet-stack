// Adapted from https://github.com/marijnh/w3c-keyname
// The shift keycode map was removed so we can use Shift as a modifier.
// For example: "Shift-]" instead of "}

import { capitalize } from "lodash"
import { useEffect } from "react"
import { useRefCurrent } from "./useRefCurrent"

const base: { [key: number]: string } = {
	8: "Backspace",
	9: "Tab",
	10: "Enter",
	12: "NumLock",
	13: "Enter",
	16: "Shift",
	17: "Control",
	18: "Alt",
	20: "CapsLock",
	27: "Escape",
	32: " ",
	33: "PageUp",
	34: "PageDown",
	35: "End",
	36: "Home",
	37: "ArrowLeft",
	38: "ArrowUp",
	39: "ArrowRight",
	40: "ArrowDown",
	44: "PrintScreen",
	45: "Insert",
	46: "Delete",
	59: ";",
	61: "=",
	91: "Meta",
	92: "Meta",
	106: "*",
	107: "+",
	108: ",",
	109: "-",
	110: ".",
	111: "/",
	144: "NumLock",
	145: "ScrollLock",
	160: "Shift",
	161: "Shift",
	162: "Control",
	163: "Control",
	164: "Alt",
	165: "Alt",
	173: "-",
	186: ";",
	187: "=",
	188: ",",
	189: "-",
	190: ".",
	191: "/",
	192: "`",
	219: "[",
	220: "\\",
	221: "]",
	222: "'",
}

const chrome = typeof navigator != "undefined" && /Chrome\/(\d+)/.exec(navigator.userAgent)
const safari = typeof navigator != "undefined" && /Apple Computer/.test(navigator.vendor)
const gecko = typeof navigator != "undefined" && /Gecko\/\d+/.test(navigator.userAgent)
const mac = typeof navigator != "undefined" && /Mac/.test(navigator.platform)
const ie =
	typeof navigator != "undefined" &&
	/MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent)
const brokenModifierNames = (chrome && (mac || +chrome[1] < 57)) || (gecko && mac)

// Fill in the digit keys
for (let i = 0; i < 10; i++) base[48 + i] = base[96 + i] = String(i)

// The function keys
for (let i = 1; i <= 24; i++) base[i + 111] = "F" + i

// And the alphabetic keys
for (let i = 65; i <= 90; i++) {
	base[i] = String.fromCharCode(i + 32)
}

function keyName(event: KeyboardEvent) {
	const ignoreKey =
		(brokenModifierNames && (event.ctrlKey || event.altKey || event.metaKey)) ||
		((safari || ie) && event.shiftKey && event.key && event.key.length == 1)
	let name = (!ignoreKey && event.key) || base[event.keyCode] || event.key || "Unidentified"
	// Edge sometimes produces wrong names (Issue #3)
	if (name == "Esc") name = "Escape"
	if (name == "Del") name = "Delete"
	// https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/8860571/
	if (name == "Left") name = "ArrowLeft"
	if (name == "Up") name = "ArrowUp"
	if (name == "Right") name = "ArrowRight"
	if (name == "Down") name = "ArrowDown"
	return name
}

// Aliases for various keyboard events, allowing shortcuts to be defined
// using some more colloquial terms.
const keyboardAliases: Record<string, string | undefined> = {
	ctrl: "control",
	mod: "meta",
	cmd: "meta",
	" ": "space",
	left: "arrowleft",
	right: "arrowright",
	down: "arrowdown",
	up: "arrowup",
	option: "alt",
	opt: "alt",
	delete: "backspace",
}

// Used for view test keyboard event mocking
export function shortcutToEvent(shortcut: string) {
	const keys = shortcut
		.split(/-(?!$)/)
		.map((str) => str.toLowerCase())
		.map((char) => keyboardAliases[char] || char)

	const parsed: ParsedShortcut = {}
	for (const key of keys) {
		if (key === "meta") parsed.metaKey = true
		else if (key === "control") parsed.ctrlKey = true
		else if (key === "alt") parsed.altKey = true
		else if (key === "shift") parsed.shiftKey = true
		// Used to emulate the behavior that all non-alphabetic keys in keyboard events
		// are capitalized:
		// https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
		else parsed.key = key.length === 1 ? key : key[0].toUpperCase() + key.slice(1)
	}

	return new KeyboardEvent("keydown", parsed)
}

interface ParsedShortcut {
	shiftKey?: boolean
	altKey?: boolean
	ctrlKey?: boolean
	metaKey?: boolean
	key?: string
}

function parseShortcut(shortcut: string) {
	const keys = shortcut
		.split(/-(?!$)/)
		.map((str) => str.toLowerCase())
		.map((char) => keyboardAliases[char] || char)

	const parsed: ParsedShortcut = {}
	for (const key of keys) {
		if (key === "meta") parsed.metaKey = true
		else if (key === "control") parsed.ctrlKey = true
		else if (key === "alt") parsed.altKey = true
		else if (key === "shift") parsed.shiftKey = true
		else parsed.key = key.toLowerCase()
	}
	return parsed
}

function formatShortcutKeys(parsed: ParsedShortcut) {
	const keys: Array<string> = []
	if (parsed.shiftKey) keys.push("shift")
	if (parsed.altKey) keys.push("alt")
	if (parsed.ctrlKey) keys.push("control")
	if (parsed.metaKey) keys.push("meta")
	if (parsed.key) keys.push(parsed.key)
	return keys
}

function formatShortcut(parsed: ParsedShortcut) {
	return formatShortcutKeys(parsed).join("-")
}

function normalizeShortcut(shortcut: string) {
	return formatShortcut(parseShortcut(shortcut))
}

const modifierCodes = new Set([
	"ControlLeft",
	"ControlRight",
	"ShiftLeft",
	"ShiftRight",
	"AltLeft",
	"AltRight",
	"MetaLeft",
	"MetaRight",
])

function parseKeyboardEvent(event: KeyboardEvent) {
	const parsed: ParsedShortcut = {}
	if (event.shiftKey) parsed.shiftKey = true
	if (event.altKey) parsed.altKey = true
	if (event.ctrlKey) parsed.ctrlKey = true
	if (event.metaKey) parsed.metaKey = true
	if (!modifierCodes.has(event.code)) parsed.key = keyName(event).toLowerCase()
	return parsed
}

function normalizeKeyboardShortcut(event: KeyboardEvent) {
	return formatShortcut(parseKeyboardEvent(event))
}

export function isShortcut(shortcut: string, event: KeyboardEvent) {
	return normalizeShortcut(shortcut) === normalizeKeyboardShortcut(event)
}

const isMac = true as boolean // process.platform === "darwin"

const shortKeys: Record<string, string> = {
	meta: isMac ? "⌘" : "^",
	control: "^",
	alt: "⌥",
	shift: "⇧",
	enter: "↵",
	tab: "⇥",
	arrowleft: "←",
	arrowright: "→",
	arrowup: "↑",
	arrowdown: "↓",
}

export function displayShortcut(shortcut: string) {
	const parsed = parseShortcut(shortcut)
	const keys = formatShortcutKeys(parsed)
	return keys
		.map((char) => shortKeys[char] || char)
		.map((char) => capitalize(char))
		.join("")
}

type KeyboardEventHandler = (event: KeyboardEvent) => void

/** Use with care. Prefer to put listeners on DOM elements to work better with focus. */
export function useShortcut(shortcut: string, fn: () => void) {
	const fnRef = useRefCurrent(fn)
	const shortcutRef = useRefCurrent(shortcut)

	useEffect(() => {
		const onKeydown: KeyboardEventHandler = (event) => {
			if (isShortcut(shortcutRef.current, event)) {
				event.preventDefault()
				fnRef.current()
			}
		}
		window.addEventListener("keydown", onKeydown)
		return () => {
			window.removeEventListener("keydown", onKeydown)
		}
	}, [])
}
