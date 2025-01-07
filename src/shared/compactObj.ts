export function compactObj<T extends Record<string, unknown>>(obj: T): Partial<T> {
	const result: Partial<T> = {}
	for (const [key, value] of Object.entries(obj)) {
		if (value !== undefined) {
			result[key as keyof T] = value as T[keyof T]
		}
	}
	return result
}
