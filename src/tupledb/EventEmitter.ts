type Callbacks = {
	[key: string]: (...args: any[]) => any
}

/** A types event emitter */
export class EventEmitter<T extends Callbacks = Callbacks> {
	private listeners: { [K in keyof T]?: Set<T[K]> } = {}

	subscribe<K extends keyof T>(key: K, listener: T[K]): () => void {
		let set = this.listeners[key] as Set<T[K]> | undefined
		if (!set) {
			set = new Set<T[K]>()
			this.listeners[key] = set as Set<T[K]>
		}

		set.add(listener)

		return () => {
			const currentSet = this.listeners[key] as Set<T[K]> | undefined
			if (!currentSet) return
			currentSet.delete(listener)
			if (currentSet.size === 0) delete this.listeners[key]
		}
	}

	emit<K extends keyof T>(key: K, ...args: Parameters<T[K]>): void {
		const set = this.listeners[key] as Set<T[K]> | undefined
		if (!set || set.size === 0) return
		for (const listener of set) listener(...args)
	}
}
