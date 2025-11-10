import { isEqual } from "lodash-es"
import { DependencyList, useRef } from "react"

export function useDeepMemo<T>(fn: () => T, deps: DependencyList) {
	const depsRef = useRef<any>(undefined)
	const valueRef = useRef<any>(undefined)

	if (!isEqual(depsRef.current, deps)) {
		valueRef.current = fn()
		depsRef.current = deps
	}

	return valueRef.current as T
}
