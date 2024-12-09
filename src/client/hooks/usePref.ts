import { useEffect, useState } from "react"
import { useClientEnvironment } from "../services/ClientEnvironment"

export function usePref<T = any>(key: string, defaultValue: T): [T, (value: T) => void]
export function usePref<T = any>(
	key: string,
	defaultValue?: T
): [T | undefined, (value: T | undefined) => void] {
	const { prefs } = useClientEnvironment()
	const [value, setValue] = useState<T | undefined>(() => prefs.get(key) ?? defaultValue)

	useEffect(() => {
		return prefs.addListener(key, setValue)
	}, [key])

	const setPref = (newValue: T | undefined) => {
		if (newValue === undefined) prefs.remove(key)
		else prefs.set(key, newValue)
		// setValue(newValue)
	}

	return [value, setPref]
}
