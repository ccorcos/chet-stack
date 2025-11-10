import { Ref, RefCallback, RefObject, useRef } from "react"
import { useRefCurrent } from "./useRefCurrent"

export function usePropRef<T>(propRef?: Ref<T>): RefObject<T | null> {
	const innerRef = useRef<T>(null)
	const propRefRef = useRefCurrent(propRef)

	const proxyRef = useRef<RefObject<T | null>>(null)
	if (!proxyRef.current) {
		proxyRef.current = {
			get current() {
				return innerRef.current
			},
			set current(value: T | null) {
				innerRef.current = value
				setRef(propRefRef.current, value)
			},
		}
	}

	return proxyRef.current!
}

function setRef<T>(target: Ref<T> | undefined, value: T | null): void {
	if (!target) return
	if (typeof target === "function") {
		;(target as RefCallback<T>)(value)
		return
	}
	// MutableRefObject<T | null>
	;(target as RefObject<T | null>).current = value
}
