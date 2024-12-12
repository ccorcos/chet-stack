import { useDeferredValue, useState } from "react"

// This is useful for forcing a re-render.
export function useCounter() {
	const [count, setCount] = useState(0)
	const inc = () => setCount((s) => s + 1)
	return [count, inc] as const
}

export function useDeferredCounter() {
	const [count, rerender] = useCounter()
	const deferredCount = useDeferredValue(count)
	const staleCount = deferredCount !== count
	return [deferredCount, staleCount, rerender] as const
}
