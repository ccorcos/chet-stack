import { compoundCompare } from "../compare"

export type Range = { gt?: string; gte?: string; lt?: string; lte?: string }

export function encodeStartBound(args: { gt?: string; gte?: string }) {
	const { gt, gte } = args
	// Inclusive start
	if (gte !== undefined) return [0, gte, 0]
	// Exclusive start
	else if (gt !== undefined) return [0, gt, 1]
	// Open start
	else return [0]
}

export function decodeStartBound(bound: any[]) {
	if (bound.length === 1) return {}
	if (bound[2] === 0) return { gte: bound[1] }
	if (bound[2] === 1) return { gt: bound[1] }
	throw new Error("Invalid start bound")
}

export function decodeEndBound(bound: any[]) {
	if (bound.length === 1) return {}
	if (bound[2] === 0) return { lte: bound[1] }
	if (bound[2] === -1) return { lt: bound[1] }
	throw new Error("Invalid end bound")
}

export function encodeEndBound(args: { lt?: string; lte?: string }) {
	const { lt, lte } = args
	// Exclusive end
	if (lt !== undefined) return [0, lt, -1]
	// Inclusive end
	else if (lte !== undefined) return [0, lte, 0]
	// Open end
	else return [1]
}

export function encodeRange(args: Range) {
	return [encodeStartBound(args), encodeEndBound(args)]
}

export function overlaps(a: Range, b: Range, compare = compoundCompare) {
	const [startA, endA] = encodeRange(a)
	const [startB, endB] = encodeRange(b)
	if (compare(endA, startB) === -1) return false
	if (compare(endB, startA) === -1) return false
	return true
}

export function containsValue(a: Range, value: string, compare = compoundCompare) {
	const [startA, endA] = encodeRange(a)
	if (compare(startA, [0, value, 0]) === 1) return false
	if (compare(endA, [0, value, 0]) === -1) return false
	return true
}

export function compareRange(a: Range, b: Range, compare = compoundCompare) {
	const [startA, endA] = encodeRange(a)
	const [startB, endB] = encodeRange(b)

	const dir = compare(startA, startB)
	if (dir !== 0) return dir

	return compare(endA, endB)
}
