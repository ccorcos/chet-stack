import { isEqual } from "lodash"
import { useCallback, useState } from "react"
import { useRefCurrent } from "./useRefCurrent"

export function useDeepState<T>(initialState: T): [T, (newState: T) => void] {
	const [state, setState] = useState<T>(initialState)

	const stateRef = useRefCurrent(state)

	const setDeepState = useCallback((newState: T) => {
		if (isEqual(stateRef.current, newState)) return
		setState(newState)
	}, [])

	return [state, setDeepState]
}
