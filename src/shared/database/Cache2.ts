/*

Back to first principles.
We're going to start with just solving the problem, and then worry about performance later.

https://www.notion.so/chetcorcos/Local-Caching-1698d4136624809a876ddfb66d16ef35
*/

import { orderedArray } from "@ccorcos/ordered-array"
import { identity } from "lodash"
import { compoundCompare } from "../compare"
import { randomId } from "../randomId"
import { InMemoryDatabase } from "./InMemoryDatabase"
import { InMemoryIntervalTree } from "./InMemoryIntervalTree"
import { ListArgs } from "./types"

// This is where we store the data for the cache.
const data = new InMemoryDatabase<string, string>()

// This is where we store the listeners for data changes in the cache.
const listeners = new InMemoryIntervalTree<[string, string, string], () => void>()

function subscribe(key: [string, string], listener: () => void) {
	const [start, end] = key
	const id = randomId()
	listeners.set([start, end, id], listener)
	return () => listeners.delete([start, end, id])
}

function emitters(keys: string[]) {
	const fns = new Set<() => void>()
	for (const key of keys) {
		for (const { value: listener } of listeners.intersects(key)) {
			fns.add(listener)
		}
	}
	return fns
}

function emit(keys: string[]) {
	for (const fn of emitters(keys)) fn()
}

// Caching logic.

const cachedRanges: [string, string][] = []
const sortedRanges = orderedArray<[string, string]>(identity, compoundCompare)

type Range = { gt?: string; gte?: string; lt?: string; lte?: string }

function encodeStartBound(args: { gt?: string; gte?: string }) {
	const { gt, gte } = args
	// Inclusive start
	if (gte !== undefined) return "0" + gte + "0"
	// Exclusive start
	else if (gt !== undefined) return "0" + gt + "1"
	// Open start
	else return "0"
}

function encodeEndBound(args: { lt?: string; lte?: string }) {
	const { lt, lte } = args
	// Exclusive end
	if (lt !== undefined) return "0" + lt + "0"
	// Inclusive end
	else if (lte !== undefined) return "0" + lte + "1"
	// Open end
	else return "1"
}

function encodeRange(args: Range): [string, string] {
	return [encodeStartBound(args), encodeEndBound(args)]
}

function decodeStartRange(start: string): { gt?: string; gte?: string } {
	let gt: string | undefined
	let gte: string | undefined

	const prefix = start[0]
	if (prefix !== "0") throw new Error("Invalid start range")
	if (start.length === 1) return { gt, gte }

	// Remove prefix and suffix
	const value = start.slice(1, -1)
	if (start[start.length - 1] === "0") {
		gte = value
	} else {
		gt = value
	}

	return { gt, gte }
}

function decodeEndRange(end: string): { lt?: string; lte?: string } {
	let lt: string | undefined
	let lte: string | undefined

	const prefix = end[0]
	if (prefix === "1") return { lt, lte }
	if (prefix !== "0") throw new Error("Invalid end range")

	// Remove prefix and suffix
	const value = end.slice(1, -1)
	if (end[end.length - 1] === "0") {
		lt = value
	} else {
		lte = value
	}

	return { lt, lte }
}

function computeCachedRange(
	args: ListArgs<string>,
	result: { key: string; value: string }[]
): Range {
	const { gt, gte, lt, lte, limit, reverse } = args

	if (limit === undefined) {
		// No limit so the cached result is the entire range requested.
		return { gt, gte, lt, lte }
	}

	if (result.length < limit) {
		// The limit doesnt matter and we have complete results.
		return { gt, gte, lt, lte }
	}

	if (reverse) {
		// Last time is the start of the range.
		return { gte: result[result.length - 1].key, lt, lte }
	}

	// Last item is the end of the range.
	return { gt, gte, lte: result[result.length - 1].key }
}

// TODO: track versions and don't clobber optimistic writes.
function insertCache(args: ListArgs<string>, result: { key: string; value: string }[]) {
	const range = computeCachedRange(args, result)
	sortedRanges.insert(cachedRanges, encodeRange(range))

	// Delete any previous data in that range.
	const setKeys = new Set<string>()
	for (const { key } of result) setKeys.add(key)
	const deleteKeys = new Set<string>()
	const existing = data.list(range)
	for (const { key } of existing) if (!setKeys.has(key)) deleteKeys.add(key)

	data.write({ set: result, delete: Array.from(deleteKeys) })
}

type LocalListResult = {
	miss?: true
	hit?: { key: string; value: string }[]
	prefix?: { key: string; value: string }[]
}

function* reverse<T>(list: T[]) {
	for (let i = list.length - 1; i >= 0; i--) yield list[i]
}

function localList(args: ListArgs<string>): LocalListResult {
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
			const result = data.list({ ...args, gt, gte })

			if (args.limit !== undefined && result.length === args.limit) {
				// COVERED
				return { hit: result }
			}

			return { prefix: result }
		}

		// HIT
		return { hit: data.list(args) }
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
		const result = data.list({ ...args, lt, lte })

		if (args.limit !== undefined && result.length === args.limit) {
			// COVERED
			return { hit: result }
		}

		return { prefix: result }
	}

	// HIT
	return { hit: data.list(args) }
}

type LocalGetResult = { hit?: string; miss?: true }

function localGet(key: string): LocalGetResult {
	const range = encodeRange({ gte: key, lte: key })
	for (const [start, end] of cachedRanges) {
		if (start > range[1]) break
		if (start <= range[0] && end >= range[1]) {
			return { hit: data.get(key) }
		}
	}
	return { miss: true }
}
