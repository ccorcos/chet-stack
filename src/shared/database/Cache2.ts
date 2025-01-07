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

// This is where we store the data for the cache.
export const localData = new InMemoryDatabase<string, string>()

// TODO: optimize this with an interval tree.
type Listener = { range: Range; id: string; fn: () => void }
const listeners: Listener[] = []
// Technically this comparison is possible without encoding, but its got a lot of if-else logic.
const compareListener = (a: Listener, b: Listener) => {
	const aKey = [...encodeRange(a.range), a.id]
	const bKey = [...encodeRange(b.range), b.id]
	return compoundCompare(aKey, bKey)
}
const sortedListeners = orderedArray<Listener>(identity, compareListener)

// This is where we store the listeners for data changes in the cache.
// const listeners = new InMemoryIntervalTree<[string, string, string], () => void>()

export function localSubscribe(range: Range, fn: () => void) {
	const listener = { range, id: randomId(), fn }
	sortedListeners.insert(listeners, listener)
	return () => sortedListeners.remove(listeners, listener)
}

function overlaps(range: Range, key: string) {
	if (range.gt !== undefined && key <= range.gt) return false
	if (range.gte !== undefined && key < range.gte) return false
	if (range.lt !== undefined && key >= range.lt) return false
	if (range.lte !== undefined && key > range.lte) return false
	return true
}

function emitters(keys: string[]) {
	const fns = new Set<() => void>()
	for (const key of keys) {
		for (const { range, fn } of listeners) {
			if (overlaps(range, key)) fns.add(fn)
		}
	}
	return fns
}

export function localEmit(keys: string[]) {
	for (const fn of emitters(keys)) fn()
}

// Caching logic.
// TODO: could just store ranges and do the encoding in the comparison.
const cachedRanges: [string, string][] = []
const sortedRanges = orderedArray<[string, string]>(identity, compoundCompare)

export type Range = { gt?: string; gte?: string; lt?: string; lte?: string }

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

// TODO: track versions and don't clobber optimistic writes.
export function insertCache(args: ListArgs<string>, result: { key: string; value: string }[]) {
	const range = computeCachedRange(args, result)
	sortedRanges.insert(cachedRanges, encodeRange(range))

	// Delete any previous data in that range.
	const setKeys = new Set<string>()
	for (const { key } of result) setKeys.add(key)
	const deleteKeys = new Set<string>()
	const existing = localData.list(range)
	for (const { key } of existing) if (!setKeys.has(key)) deleteKeys.add(key)

	localData.write({ set: result, delete: Array.from(deleteKeys) })
}

type LocalListResult = {
	miss?: true
	hit?: { key: string; value: string }[]
	prefix?: { key: string; value: string }[]
}

// TODO someday. Partial result, suffix result.
export function localList(args: ListArgs<string>): LocalListResult {
	const range = encodeRange(args)

	// NOTE: this doesn't for using List as a Get.
	// TODO: this also seems to break then for limit:1 cases with gte == lte
	if (range[0] === range[1]) throw new Error("Not implemented yet.")

	if (args.reverse) {
		// REVERSE
		let cursor = range[1]
		for (const [start, end] of reverse(cachedRanges)) {
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
			const result = localData.list({ ...args, gt, gte })

			if (args.limit !== undefined && result.length === args.limit) {
				// COVERED
				return { hit: result }
			}

			return { prefix: result }
		}

		// HIT
		return { hit: localData.list(args) }
	}

	// FORWARD
	let cursor = range[0]
	for (const [start, end] of cachedRanges) {
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
		const result = localData.list({ ...args, lt, lte })

		if (args.limit !== undefined && result.length === args.limit) {
			// COVERED
			return { hit: result }
		}

		return { prefix: result }
	}

	// HIT
	return { hit: localData.list(args) }
}

type LocalGetResult = { hit?: string; miss?: true }

export function localGet(key: string): LocalGetResult {
	const range = encodeRange({ gte: key, lte: key })
	for (const [start, end] of cachedRanges) {
		if (start > range[1]) break
		if (start <= range[0] && end >= range[1]) {
			return { hit: localData.get(key) }
		}
	}
	return { miss: true }
}

export function localWrite(args: WriteArgs<string, string>) {
	// Optimistic write
	localData.write(args)

	const keys = new Set<string>()
	for (const { key } of args.set ?? []) keys.add(key)
	for (const key of args.delete ?? []) keys.add(key)

	// Write cache ranges so we can read our writes.
	for (const key of keys) {
		const range = encodeRange({ gte: key, lte: key })
		sortedRanges.insert(cachedRanges, range)
	}

	// Emit
	localEmit(Array.from(keys))
}

// TODO:
// - better subscribe with encoded ranges.
// - how to track caches ranges for deleted items?
// - how to reference count and evict?

// - tests
// - hooks to try it out
// - eviction on unsubscribe
// - think more about optimistic writes...
// - realtime sync...

/*

Challenges ahead...

subscribe can use the range encoded bounds logic.
on unsubscribe, we can figure out what ranges to evict.

for optimistic writes, we can just YOLO for now.
when optimisitc writing, we also kind of need to tell the cached ranges what now exists though.
I can imagine a situation where want to add an item to a list and we know it will be a prefix result
to another query but since we haven't actually recieved the result from the server, all we know is
that it's a partial result from the middle.

We don't need to worry as much about clobbering optimistic writes because we aren't re-fetching based
on a server subscription yet.




*/
