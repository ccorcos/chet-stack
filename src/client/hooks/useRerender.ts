import { useState } from "react"

export function useRerender() {
	const [state, setState] = useState(0)
	return () => setState((s) => s + 1)
}
