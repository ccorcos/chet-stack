import { useEffect, useState } from "react"
import { isDarkMode, setDarkMode } from "ui/helpers/darkmode"
import { useCommand } from "./useCommand"

export function useDarkModeSwitcher() {
	const [mode, setMode] = useState<"auto" | "light" | "dark">("auto")

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

	useEffect(() => {
		setDarkMode(mode)
	}, [mode])

	return { mode, setMode }
}
