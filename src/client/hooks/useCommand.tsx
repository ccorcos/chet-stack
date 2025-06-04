import { useEffect, useMemo, useRef } from "react"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { Command } from "../services/Command"
import { useRefCurrent } from "./useRefCurrent"

function useStableCallbacks<O extends { [key: string]: any }>(obj: O) {
	const stableObj = useRef<any>({})
	const currentObj = useRefCurrent<any>(obj)

	useMemo(() => {
		for (const key in obj) {
			if (typeof obj[key] === "function") {
				if (typeof stableObj.current[key] === "function") continue
				else stableObj.current[key] = (...args: any[]) => currentObj.current[key](...args)
			} else {
				stableObj.current[key] = obj[key]
			}
		}
	}, [obj])

	return stableObj.current
}

function useUnstableWarning(x: any) {
	const first = useRef(true)
	useMemo(() => {
		if (first.current) {
			first.current = false
			return
		}
		console.warn("Unstable reference", x)
	}, [x])
}

export function useCommand(command: Command) {
	const { cmd } = useClientEnvironment()
	const stable = useStableCallbacks(command)
	useUnstableWarning(stable)
	useEffect(() => {
		return cmd.register(stable)
	}, [stable])
}
