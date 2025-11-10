import { useMemo } from "react"
import { mergeEvents } from "ui/helpers/mergeEvents"

export function useMergeCallbacks<T extends Event | React.UIEvent>(
	...callbacks: ((event: T) => void)[]
) {
	return useMemo(() => {
		return mergeEvents(...callbacks)
	}, callbacks)
}
