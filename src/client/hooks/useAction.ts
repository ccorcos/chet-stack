import { useState } from "react"
import { useLoader } from "./useLoader"

export function useAction<T extends any[]>(name: string, fn: (...args: T) => Promise<void>) {
	const [args, setArgs] = useState<T | undefined>(undefined)

	const loader = useLoader([name, ...(args || [])], async () => {
		if (args === undefined) return
		await fn(...args)
		setArgs(undefined)
	})

	loader.suspend()

	return (...args: T) => setArgs(args)
}
