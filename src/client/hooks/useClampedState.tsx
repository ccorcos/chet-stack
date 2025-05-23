import { clamp } from "lodash"
import React, { useCallback, useState } from "react"
import { useRefCurrent } from "./useRefCurrent"

export function useClampedState(initialValue: number, range: [number, number]) {
	const rangeRef = useRefCurrent(range)
	const [state, _setState] = useState(clamp(initialValue, ...range))

	// Create a clamped setState function that ensures values stay within the specified range
	const setState = useCallback((value: React.SetStateAction<number>) => {
		return _setState((prevState) => {
			prevState = clamp(prevState, ...rangeRef.current)
			const newValue = typeof value === "function" ? value(prevState) : value
			return clamp(newValue, ...rangeRef.current)
		})
	}, [])

	return [clamp(state, ...range), setState] as [
		number,
		React.Dispatch<React.SetStateAction<number>>,
	]
}
