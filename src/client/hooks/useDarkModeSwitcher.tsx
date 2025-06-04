import { useEffect, useState } from "react"
import { useCommand } from "./useCommand"

function isDarkMode() {
	return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function useDarkModeSwitcher() {
	const [mode, setMode] = useState("auto")

	useCommand({
		name: "Light Mode",
		shortcut: "cmd-shift-l",
		enabled: () => mode === "dark" || (mode === "auto" && isDarkMode()),
		execute: () => setMode("light"),
	})

	useCommand({
		name: "Dark Mode",
		shortcut: "cmd-shift-l",
		enabled: () => mode === "light" || (mode === "auto" && !isDarkMode()),
		execute: () => setMode("dark"),
	})

	useCommand({
		name: "System Light/Dark Mode",
		enabled: () => mode !== "auto",
		execute: () => setMode("auto"),
	})

	// useShortcut("cmd-shift-l", () => {
	// 	if (mode === "auto") {
	// 		const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
	// 		if (isDark) setMode("light")
	// 		else setMode("dark")
	// 	} else if (mode === "light") {
	// 		setMode("dark")
	// 	} else {
	// 		setMode("light")
	// 	}
	// })

	useEffect(() => {
		if (mode === "auto") {
			document.documentElement.classList.remove("light", "dark")
		} else if (mode === "light") {
			document.documentElement.classList.remove("dark")
			document.documentElement.classList.add("light")
		} else {
			document.documentElement.classList.remove("light")
			document.documentElement.classList.add("dark")
		}
	}, [mode])

	return { mode, setMode }
}
