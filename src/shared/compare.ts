export function compare(a: any, b: any) {
	if (a === b) return 0
	if (a > b) return 1
	return -1
}

export function compoundCompare(a: any[], b: any[], cmp = compare) {
	const len = Math.min(a.length, b.length)

	for (let i = 0; i < len; i++) {
		const aa = a[i]
		const bb = b[i]

		let dir
		if (Array.isArray(aa) || Array.isArray(bb)) {
			if (!Array.isArray(aa) || !Array.isArray(bb)) throw new Error("Invalid array comparison")
			dir = compoundCompare(aa, bb, cmp)
		} else {
			dir = cmp(aa, bb)
		}
		if (dir !== 0) return dir
	}

	return cmp(a.length, b.length)
}
