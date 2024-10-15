import { useEffect, useMemo } from "react"
import { useDeepState } from "./useDeepState"

export function useLocalStorageState<T>(key: string, initialState: T): [T, (newState: T) => void] {
	const loadedState = useMemo(() => {
		const storedValue = localStorage.getItem(key)
		return storedValue !== null ? JSON.parse(storedValue) : initialState
	}, [key])

	const [state, setState] = useDeepState<T>(loadedState)

	useEffect(() => {
		if (state === loadedState) return
		localStorage.setItem(key, JSON.stringify(state))
	}, [key, state])

	return [state, setState]
}
