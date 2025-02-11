import { useState } from "react"

export function useInputFocus() {
	const [focused, setFocused] = useState(false)
	return {
		onFocus: () => setFocused(true),
		onBlur: () => setFocused(false),
		focused,
	}
}
