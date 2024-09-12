import { useState } from "react"

// This is useful for forcing a re-render.
export function useCounter() {
	const [count, setCount] = useState(0)
	const inc = () => setCount((s) => s + 1)
	return [count, inc] as const
}
