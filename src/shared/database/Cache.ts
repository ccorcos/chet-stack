/*

Back to first principles.
We're going to start with just solving the problem, and then worry about performance later.

https://www.notion.so/chetcorcos/Local-Caching-1698d4136624809a876ddfb66d16ef35
*/

import { orderedArray } from "@ccorcos/ordered-array"
import { identity } from "lodash"
import { compactObj } from "../compactObj"
import { compoundCompare } from "../compare"
import { randomId } from "../randomId"
import { reverse } from "../reverse"
import { InMemoryDatabase } from "./InMemoryDatabase"
import { ListArgs, WriteArgs } from "./types"

export type Range = { gt?: string; gte?: string; lt?: string; lte?: string }

type Listener = { range: Range; id: string; fn: () => void }

export type LocalListResult = {
	miss?: true
	hit?: { key: string; value: string }[]
	prefix?: { key: string; value: string }[]
}
export type LocalGetResult = { hit?: string; miss?: true }

// Technically this comparison is possible without encoding, but its got a lot of if-else logic.
const compareListener = (a: Listener, b: Listener) => {
	const aKey = [...encodeRange(a.range), a.id]
	const bKey = [...encodeRange(b.range), b.id]
	return compoundCompare(aKey, bKey)
}
const sortedListeners = orderedArray<Listener>(identity, compareListener)

export class LocalCache {
	localData = new InMemoryDatabase<string, string>()

	// ==========================================================================
	// Listeners
	// ==========================================================================

	// TODO: optimize this with an interval tree.
	listeners: Listener[] = []

	localSubscribe(range: Range, fn: () => void) {
		const listener = { range, id: randomId(), fn }
		sortedListeners.insert(this.listeners, listener)
		return () => {
			sortedListeners.remove(this.listeners, listener)
		}
	}

	localEmit(ranges: Range[]) {
		const fns = new Set<() => void>()
		for (const r of ranges) {
			for (const { range, fn } of this.listeners) {
				if (overlaps(r, range)) fns.add(fn)
			}
		}
		for (const fn of fns) fn()
	}

	// ==========================================================================
	// Data ranges
	// ==========================================================================

	// TODO: could just store ranges and do the encoding in the comparison.
	cachedRanges: [string, string][] = []

	// TODO: track versions and don't clobber optimistic writes.
	insertCache(args: ListArgs<string>, result: { key: string; value: string }[]) {
		const range = computeCachedRange(args, result)
		sortedRanges.insert(this.cachedRanges, encodeRange(range))

		// Delete any previous data in that range.
		const setKeys = new Set<string>()
		for (const { key } of result) setKeys.add(key)
		const deleteKeys = new Set<string>()
		const existing = this.localData.list(range)
		for (const { key } of existing) if (!setKeys.has(key)) deleteKeys.add(key)

		this.localData.write({ set: result, delete: Array.from(deleteKeys) })

		this.localEmit([range])
	}

	// ==========================================================================
	// Data ranges
	// ==========================================================================

	localList(args: ListArgs<string>): LocalListResult {
		const range = encodeRange(args)

		// NOTE: this doesn't for using List as a Get.
		// TODO: this also seems to break then for limit:1 cases with gte == lte
		if (range[0] === range[1]) throw new Error("Not implemented yet.")

		if (args.reverse) {
			// REVERSE
			let cursor = range[1]
			for (const [start, end] of reverse(this.cachedRanges)) {
				if (start <= cursor && end >= cursor) {
					cursor = start
					if (cursor <= range[0]) break
				}
				// No early exit because the list is ordered by start, not end.
			}

			// MISS
			if (cursor === range[1]) return { miss: true }

			// PREFIX
			if (cursor > range[0]) {
				const { gt, gte } = decodeStartRange(cursor)
				const result = this.localData.list({ ...args, gt, gte })

				if (args.limit !== undefined && result.length === args.limit) {
					// COVERED
					return { hit: result }
				}

				return { prefix: result }
			}

			// HIT
			return { hit: this.localData.list(args) }
		}

		// FORWARD
		let cursor = range[0]
		for (const [start, end] of this.cachedRanges) {
			if (start <= cursor && end >= cursor) {
				cursor = end
				if (cursor >= range[1]) break
			}
			if (start > cursor) break
		}

		// MISS
		if (cursor === range[0]) return { miss: true }

		// PREFIX
		if (cursor < range[1]) {
			const { lt, lte } = decodeEndRange(cursor)
			const result = this.localData.list({ ...args, lt, lte })

			if (args.limit !== undefined && result.length === args.limit) {
				// COVERED
				return { hit: result }
			}

			return { prefix: result }
		}

		// HIT
		return { hit: this.localData.list(args) }
	}

	localGet(key: string): LocalGetResult {
		const range = encodeRange({ gte: key, lte: key })
		for (const [start, end] of this.cachedRanges) {
			if (start > range[1]) break
			if (start <= range[0] && end >= range[1]) {
				return { hit: this.localData.get(key) }
			}
		}
		return { miss: true }
	}

	localWrite(args: WriteArgs<string, string>) {
		// Optimistic write
		this.localData.write(args)

		const keys = new Set<string>()
		for (const { key } of args.set ?? []) keys.add(key)
		for (const key of args.delete ?? []) keys.add(key)

		// Write cache ranges so we can read our writes.
		const ranges = Array.from(keys).map(keyToRange)

		for (const range of ranges) {
			sortedRanges.insert(this.cachedRanges, encodeRange(range))
		}

		// Emit
		this.localEmit(ranges)
	}
}

/** It's easier to enumerate cases where its false than true. */
export function overlaps(r1: Range, r2: Range) {
	const left1 = r1.gt ?? r1.gte
	const right1 = r1.lt ?? r1.lte

	const left2 = r2.gt ?? r2.gte
	const right2 = r2.lt ?? r2.lte

	//   (R1)
	//            (L2)
	if (right1 !== undefined && left2 !== undefined) {
		if (right1 < left2) return false
		// Handle equal bounds
		if (r1.lte !== undefined) {
			if (r1.lte === r2.gte) return true
			if (r1.lte === r2.gt) return false
		}
		if (r1.lt !== undefined) {
			if (r1.lt === r2.gte) return false
			if (r1.lt === r2.gt) return false
		}
	}

	//            (L1)
	//    (R2)
	if (right2 !== undefined && left1 !== undefined) {
		if (right2 < left1) return false
		// Handle equal bounds
		if (r1.gte !== undefined) {
			if (r1.gte === r2.lte) return true
			if (r1.gte === r2.lt) return false
		}
		if (r1.gt !== undefined) {
			if (r1.gt === r2.lte) return false
			if (r1.gt === r2.lt) return false
		}
	}

	return true
}

export function keyToRange(key: string) {
	return { gte: key, lte: key }
}

// Caching logic.
const sortedRanges = orderedArray<[string, string]>(identity, compoundCompare)

export function encodeStartBound(args: { gt?: string; gte?: string }) {
	const { gt, gte } = args
	// Inclusive start
	if (gte !== undefined) return "0" + gte + "0"
	// Exclusive start
	else if (gt !== undefined) return "0" + gt + "1"
	// Open start
	else return "0"
}

export function encodeEndBound(args: { lt?: string; lte?: string }) {
	const { lt, lte } = args
	// Exclusive end
	if (lt !== undefined) return "0" + lt + "0"
	// Inclusive end
	else if (lte !== undefined) return "0" + lte + "1"
	// Open end
	else return "1"
}

export function encodeRange(args: Range): [string, string] {
	return [encodeStartBound(args), encodeEndBound(args)]
}

export function decodeStartRange(start: string): { gt?: string; gte?: string } {
	const range: { gt?: string; gte?: string } = {}

	const prefix = start[0]
	if (prefix !== "0") throw new Error("Invalid start range")
	if (start.length === 1) return range

	// Remove prefix and suffix
	const value = start.slice(1, -1)
	if (start[start.length - 1] === "0") {
		range.gte = value
	} else {
		range.gt = value
	}

	return range
}

export function decodeEndRange(end: string): { lt?: string; lte?: string } {
	const range: { lt?: string; lte?: string } = {}

	const prefix = end[0]
	if (prefix === "1") return range
	if (prefix !== "0") throw new Error("Invalid end range")

	// Remove prefix and suffix
	const value = end.slice(1, -1)
	if (end[end.length - 1] === "0") {
		range.lt = value
	} else {
		range.lte = value
	}

	return range
}

export function decodeRange([start, end]: [string, string]): Range {
	return { ...decodeStartRange(start), ...decodeEndRange(end) }
}

export function computeCachedRange(
	args: ListArgs<string>,
	result: { key: string; value: string }[]
): Range {
	const { gt, gte, lt, lte, limit, reverse } = args

	if (limit === undefined) {
		// No limit so the cached result is the entire range requested.
		return compactObj({ gt, gte, lt, lte })
	}

	if (result.length < limit) {
		// The limit doesnt matter and we have complete results.
		return compactObj({ gt, gte, lt, lte })
	}

	if (reverse) {
		// Last time is the start of the range.
		return compactObj({ gte: result[result.length - 1].key, lt, lte })
	}

	// Last item is the end of the range.
	return compactObj({ gt, gte, lte: result[result.length - 1].key })
}
