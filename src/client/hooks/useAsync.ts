import { isEqual } from "lodash"
import { useEffect, useRef, useState } from "react"
import { useRefCurrent } from "./useRefCurrent"
import { useRefPrevious } from "./useRefPrevious"

export function useAsync<T, Args extends any[]>(fn: (...args: Args) => Promise<T>, args: Args) {
	const [state, setState] = useState<T | undefined>(undefined)

	const currentFn = useRefCurrent(fn)

	const changeCount = useRef(0)
	const prevArgs = useRefPrevious(args)
	const same = isEqual(prevArgs.current, args)
	if (!same) changeCount.current += 1

	useEffect(() => {
		console.log("call effect", JSON.stringify(args))
		const currentCount = changeCount.current
		currentFn.current(...args).then((result) => {
			if (changeCount.current === currentCount) {
				console.log("HERE")
				setState(result)
			}
		})
		return
	}, [changeCount.current])

	return state
}
