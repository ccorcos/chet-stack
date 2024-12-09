type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue }

/**
 * Use this to store state local to the device.
 */
export class LocalPreferences<V = any> {
	private prefix: string

	constructor(prefix: string = "prefs:") {
		this.prefix = prefix
	}

	get(key: string): V | undefined {
		const value = localStorage.getItem(this.prefix + key)
		if (value === null) return undefined
		try {
			return JSON.parse(value) as any
		} catch {
			return undefined
		}
	}

	set(key: string, value: V): void {
		localStorage.setItem(this.prefix + key, JSON.stringify(value))
		this.emit(key, value)
	}

	remove(key: string): void {
		localStorage.removeItem(this.prefix + key)
		this.emit(key, undefined)
	}

	clear(): void {
		for (let i = localStorage.length - 1; i >= 0; i--) {
			const key = localStorage.key(i)
			if (key?.startsWith(this.prefix)) {
				localStorage.removeItem(key)
			}
		}
	}

	listeners: { [key: string]: Set<(value: V | undefined) => void> } = {}

	addListener(key: string, fn: (value: V | undefined) => void) {
		if (!this.listeners[key]) this.listeners[key] = new Set()

		this.listeners[key].add(fn)
		return () => {
			this.listeners[key]?.delete(fn)
			if (this.listeners[key]?.size === 0) {
				delete this.listeners[key]
			}
		}
	}

	emit(key: string, value: V | undefined) {
		if (this.listeners[key]) {
			for (const listener of this.listeners[key]) {
				listener(value)
			}
		}
	}
}
