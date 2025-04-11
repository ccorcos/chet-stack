export type Compare<K> = (a: K, b: K) => number

export function compare<K = any>(a: K, b: K) {
	if (a === b) return 0
	if (a > b) return 1
	return -1
}

/** This does not recursively compound compare! */
export function compoundCompare<K>(a: K[], b: K[], compareKey: Compare<K> = compare) {
	const len = Math.min(a.length, b.length)

	for (let i = 0; i < len; i++) {
		const aa = a[i]
		const bb = b[i]

		const dir = compareKey(aa, bb)
		if (dir !== 0) return dir
	}

	return compare(a.length, b.length)
}
