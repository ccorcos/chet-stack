/*

One trick for comparing overlapping ranges that are potentially open or closed on each end
is to encode the range bounds as a tuple, called a "bound" and then comparing the bounds.

For example:
- (10, 11) -> [0, 10, 1], [0, 11, -1]
- [10, 11] -> [0, 10, 0], [0, 11, 0]
- (∞, ∞) -> [0], [1]

This makes it much easier to write compareRange and overlapsRange.

*/

import { Compare, compare, compoundCompare } from "shared/compare"

export type Range<K> = { gt?: K; gte?: K; lt?: K; lte?: K }

export type Bound<K> = [number] | [number, K, number]

export function encodeStartBound<K>(args: { gt?: K; gte?: K }): Bound<K> {
	const { gt, gte } = args
	// Inclusive start
	if (gte !== undefined) return [0, gte, 0]
	// Exclusive start
	else if (gt !== undefined) return [0, gt, 1]
	// Open start
	else return [0]
}

export function decodeStartBound<K>(bound: Bound<K>): { gt?: K; gte?: K } {
	if (bound.length === 1) return {}
	if (bound[2] === 0) return { gte: bound[1] }
	if (bound[2] === 1) return { gt: bound[1] }

	// If we get an end bound, we treat it as gte so that we can join ranges.
	if (bound[2] === -1) return { gte: bound[1] }
	throw new Error("Invalid start bound")
}

export function encodeEndBound<K>(args: { lt?: K; lte?: K }): Bound<K> {
	const { lt, lte } = args
	// Exclusive end
	if (lt !== undefined) return [0, lt, -1]
	// Inclusive end
	else if (lte !== undefined) return [0, lte, 0]
	// Open end
	else return [1]
}

export function decodeEndBound<K>(bound: Bound<K>): { lt?: K; lte?: K } {
	if (bound.length === 1) return {}
	if (bound[2] === 0) return { lte: bound[1] }
	if (bound[2] === -1) return { lt: bound[1] }

	// If we get a start bound, we treat it as lte so that we can join ranges.
	if (bound[2] === 1) return { lte: bound[1] }
	throw new Error("Invalid end bound")
}

export function encodeRange<K>(args: Range<K>): [Bound<K>, Bound<K>] {
	return [encodeStartBound(args), encodeEndBound(args)]
}

export function decodeRange<K>(args: [Bound<K>, Bound<K>]): Range<K> {
	const [start, end] = args
	return { ...decodeStartBound(start), ...decodeEndBound(end) }
}

export function compareBound<K>(a: Bound<K>, b: Bound<K>, compareKey: Compare<K> = compare) {
	return compoundCompare(a, b, (x, y) => {
		if (typeof x === "number" || typeof y === "number") return compare(x, y)
		else return compareKey(x, y)
	})
}

export function overlapsRange<K>(a: Range<K>, b: Range<K>, compareKey: Compare<K> = compare) {
	const [startA, endA] = encodeRange(a)
	const [startB, endB] = encodeRange(b)
	if (compareBound(endA, startB, compareKey) === -1) return false
	if (compareBound(endB, startA, compareKey) === -1) return false
	return true
}

export function rangeContains<K>(a: Range<K>, value: K, compareKey: Compare<K> = compare) {
	const [startA, endA] = encodeRange(a)
	if (compareBound(startA, [0, value, 0], compareKey) === 1) return false
	if (compareBound(endA, [0, value, 0], compareKey) === -1) return false
	return true
}

export function compareRange<K>(a: Range<K>, b: Range<K>, compareKey: Compare<K> = compare) {
	const [startA, endA] = encodeRange(a)
	const [startB, endB] = encodeRange(b)

	const dir = compareBound(startA, startB, compareKey)
	if (dir !== 0) return dir

	return compareBound(endA, endB, compareKey)
}
