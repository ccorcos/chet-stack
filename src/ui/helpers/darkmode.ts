export function isDarkMode() {
	return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function setDarkMode(mode: "auto" | "light" | "dark") {
	if (mode === "auto") {
		document.documentElement.classList.remove("light", "dark")
	} else if (mode === "light") {
		document.documentElement.classList.remove("dark")
		document.documentElement.classList.add("light")
	} else {
		document.documentElement.classList.remove("light")
		document.documentElement.classList.add("dark")
	}
}
