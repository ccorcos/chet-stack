import { isEqual } from "lodash-es"
import { useEffect, useMemo, useState } from "react"

export type StoreListener<T> = (state: T) => void

export class Store<T> {
	constructor(public state: T) {}
	setState = (state: T) => {
		if (isEqual(this.state, state)) return
		this.state = state
		this.emit()
	}

	private listeners = new Set<StoreListener<T>>()
	addListener = (listener: StoreListener<T>) => {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}

	emit = () => {
		for (const listener of this.listeners) listener(this.state)
	}
}

export function useStore<T>(initialState: T): Store<T> {
	const store = useMemo(() => new Store(initialState), [])
	return store
}

export function useStoreState<T>(store: Store<T>): T {
	const [state, setState] = useState(store.state)
	useEffect(() => store.addListener(setState), [store])
	return state
}
