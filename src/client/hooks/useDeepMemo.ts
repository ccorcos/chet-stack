import { isEqual } from "lodash"
import { DependencyList, useRef } from "react"

export function useDeepMemo<T>(fn: () => T, deps: DependencyList) {
	const depsRef = useRef<any>()
	const valueRef = useRef<any>()

	if (!isEqual(depsRef.current, deps)) {
		valueRef.current = fn()
		depsRef.current = deps
	}

	return valueRef.current as T
}
