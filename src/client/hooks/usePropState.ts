import { startTransition, useLayoutEffect, useState } from "react"

export function usePropState<T>(propValue: T, _startTransition = startTransition) {
	const [stateValue, setStateValue] = useState(propValue)

	useLayoutEffect(() => {
		_startTransition(() => {
			setStateValue(propValue)
		})
	}, [propValue])

	return stateValue
}
