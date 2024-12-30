export function compare(a: any, b: any) {
	if (a === b) return 0
	if (a > b) return 1
	return -1
}

export function compoundCompare(a: any[], b: any[], cmp = compare) {
	const len = Math.min(a.length, b.length)

	for (let i = 0; i < len; i++) {
		const dir = cmp(a[i], b[i])
		if (dir !== 0) return dir
	}

	return cmp(a.length, b.length)
}
