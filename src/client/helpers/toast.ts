export function toast(message: string) {
	const div = document.createElement("div")
	document.body.appendChild(div)
	div.style.position = "fixed"
	div.style.right = "12px"
	div.style.bottom = "12px"
	div.style.backgroundColor = "var(--background)"
	div.style.boxShadow = "var(--shadow)"
	div.style.padding = "12px"
	div.style.borderRadius = "4px"
	div.style.zIndex = "1000"

	div.textContent = message

	setTimeout(() => {
		document.body.removeChild(div)
	}, 1000)
}
