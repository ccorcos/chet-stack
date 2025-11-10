import { useRef } from "react"

export function useRefCurrent<T>(value: T) {
	const ref = useRef<T>(value)
	ref.current = value
	return ref
}
