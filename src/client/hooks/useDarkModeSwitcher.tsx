import { useEffect, useState } from "react"
import { useShortcut } from "./useShortcut"

export function useDarkModeSwitcher() {
	const [mode, setMode] = useState("auto")

	useShortcut("cmd-shift-l", () => {
		if (mode === "auto") {
			const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
			if (isDark) setMode("light")
			else setMode("dark")
		} else if (mode === "light") {
			setMode("dark")
		} else {
			setMode("light")
		}
	})

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
