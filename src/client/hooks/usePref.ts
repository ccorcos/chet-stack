import { useEffect, useMemo, useState } from "react"
import { Store, useStore } from "ui/hooks/useStore"
import { useClientEnvironment } from "../services/ClientEnvironment"

export function usePref<T = any>(key: string, defaultValue: T): [T, (value: T) => void] {
	const { prefs } = useClientEnvironment()
	const [value, setValue] = useState<T>(() => prefs.get(key) ?? defaultValue)

	useEffect(() => {
		return prefs.addListener(key, setValue)
	}, [key])

	const setPref = (newValue: T | undefined) => {
		if (newValue === undefined) prefs.remove(key)
		else prefs.set(key, newValue)
	}

	return [value, setPref]
}

export function usePrefStore<T = any>(key: string, defaultValue: T): Store<T> {
	const { prefs } = useClientEnvironment()
	const initialValue = useMemo(() => prefs.get(key) ?? defaultValue, [])
	const store = useStore<T>(initialValue)

	useEffect(() => {
		return prefs.addListener(key, store.setState)
	}, [key])

	useEffect(() => {
		return store.addListener((value) => prefs.set(key, value))
	}, [key])

	return store
}
