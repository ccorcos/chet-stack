import { Ref, RefCallback, RefObject, useRef } from "react"
import { useRefCurrent } from "./useRefCurrent"

export function usePropRef<T>(propRef?: Ref<T>): RefObject<T | null> {
	const innerRef = useRef<T>(null)
	const propRefRef = useRefCurrent(propRef)

	let ref: RefObject<T | null> | undefined
	if (ref) {
		ref = {
			get current() {
				return innerRef.current
			},
			set current(value: T | null) {
				innerRef.current = value
				setRef(propRefRef.current, value)
			},
		}
	}

	return ref!
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
