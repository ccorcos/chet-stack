import React, { useCallback, useState } from "react"
import { useRefCurrent } from "./useRefCurrent"

export function useTransformedState<T>(
	initialValue: T,
	transform: (value: T) => T
): [T, React.Dispatch<React.SetStateAction<T>>] {
	const transformRef = useRefCurrent(transform)

	// Don't transform on initialization. This way, for example, if we set the selected index in a list
	// to 10, but it takes some time for those items to load, then we aren't clobbering that value to 0.
	const [state, _setState] = useState(() => initialValue)

	const setState = useCallback((value: React.SetStateAction<T>) => {
		return _setState((prevState) => {
			const prevTransformed = transformRef.current(prevState)
			const newValue =
				typeof value === "function" ? (value as (prev: T) => T)(prevTransformed) : value
			return transformRef.current(newValue)
		})
	}, [])

	return [transformRef.current(state), setState]
}
