/*

Back to first principles.
We're going to start with just solving the problem, and then worry about performance later.

https://www.notion.so/chetcorcos/Local-Caching-1698d4136624809a876ddfb66d16ef35
*/

import { orderedArray } from "@ccorcos/ordered-array"
import { identity } from "lodash"
import { compactObj } from "../compactObj"
import { compare, compoundCompare } from "../compare"
import { randomId } from "../randomId"
import { reverse } from "../reverse"
import { InMemoryDatabase } from "./InMemoryDatabase"
import {
	compareRange,
	decodeEndBound,
	decodeStartBound,
	encodeRange,
	overlaps,
	Range,
} from "./Range"
import { ListArgs, WriteArgs } from "./types"

export type LocalListResult<V = string> = {
	miss?: true
	hit?: { key: string; value: V }[]
	prefix?: { key: string; value: V }[]
}

export type LocalGetResult<V = string> = { hit?: V; miss?: true }

type Listener = { range: Range; id: string; fn: () => void }

const sortedListeners = orderedArray<Listener>(identity, (a: Listener, b: Listener) => {
	const dir = compareRange(a.range, b.range)
	if (dir !== 0) return dir
	return compare(a.id, b.id)
})

const sortedRanges = orderedArray<Range>(identity, compareRange)

export class Cache {
	data = new InMemoryDatabase<string, string>()

	// ==========================================================================
	// Listeners
	// ==========================================================================

	// TODO: optimize this with an interval tree.
	listeners: Listener[] = []

	subscribe(range: Range, fn: () => void) {
		const listener = { range, id: randomId(), fn }
		sortedListeners.insert(this.listeners, listener)
		return () => {
			sortedListeners.remove(this.listeners, listener)
		}
	}

	emit(ranges: Range[]) {
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
	cachedRanges: Range[] = []

	// TODO: track versions and don't clobber optimistic writes.
	insert(args: ListArgs<string>, result: { key: string; value: string }[]) {
		const range = computeCachedRange(args, result)
		sortedRanges.insert(this.cachedRanges, range)

		// Delete any previous data in that range.
		const setKeys = new Set<string>()
		for (const { key } of result) setKeys.add(key)
		const deleteKeys = new Set<string>()
		const existing = this.data.list(range)
		for (const { key } of existing) if (!setKeys.has(key)) deleteKeys.add(key)

		this.data.write({ set: result, delete: Array.from(deleteKeys) })

		this.emit([range])
	}

	// ==========================================================================
	// Data ranges
	// ==========================================================================

	list(args: ListArgs<string>): LocalListResult {
		const range = encodeRange(args)

		const eq = (a: any[], b: any[]) => compoundCompare(a, b) === 0
		const gt = (a: any[], b: any[]) => compoundCompare(a, b) === 1
		const gte = (a: any[], b: any[]) => compoundCompare(a, b) !== -1
		const lt = (a: any[], b: any[]) => compoundCompare(a, b) === -1
		const lte = (a: any[], b: any[]) => compoundCompare(a, b) !== 1

		if (gt(range[0], range[1])) throw new Error("Invalid range.")

		// gte === lte
		if (eq(range[0], range[1])) {
			const cursor = range[0]
			for (const range of this.cachedRanges) {
				const [left, right] = encodeRange(range)
				if (gt(left, cursor)) return { miss: true }
				if (lt(right, cursor)) continue
				const result = this.data.list(args)
				return { hit: result }
			}
		}

		if (args.reverse) {
			// REVERSE
			let miss = true
			let cursor = range[1]
			for (const r of reverse(this.cachedRanges)) {
				const [start, end] = encodeRange(r)
				if (lte(start, cursor) && gte(end, cursor)) {
					miss = false
					cursor = start
					if (lte(start, range[0])) break
				}
				// No early exit because the list is ordered by start, not end and we're going in reverse.
			}

			// MISS
			if (miss) return { miss: true }

			// PREFIX
			if (gt(cursor, range[0])) {
				const { gt, gte } = decodeStartBound(cursor)
				const result = this.data.list({ ...args, gt, gte })

				if (args.limit !== undefined && result.length === args.limit) {
					// COVERED
					return { hit: result }
				}

				return { prefix: result }
			}

			// HIT
			return { hit: this.data.list(args) }
		}

		// FORWARD
		let miss = true
		let cursor = range[0]
		for (const r of this.cachedRanges) {
			const [start, end] = encodeRange(r)
			if (lte(start, cursor) && gte(end, cursor)) {
				miss = false
				cursor = end
				if (gte(cursor, range[1])) break
			}
			// Early exit.
			if (gt(start, cursor)) break
		}

		// MISS
		if (miss) return { miss: true }

		// PREFIX
		if (lt(cursor, range[1])) {
			const { lt, lte } = decodeEndBound(cursor)
			const result = this.data.list({ ...args, lt, lte })

			if (args.limit !== undefined && result.length === args.limit) {
				// COVERED
				return { hit: result }
			}

			return { prefix: result }
		}

		// HIT
		return { hit: this.data.list(args) }
	}

	get(key: string): LocalGetResult {
		const result = this.list({ gte: key, lte: key })
		if (result.hit) return { hit: result.hit[0]?.value }
		else return { miss: true }
	}

	write(args: WriteArgs<string, string>) {
		// Optimistic write
		this.data.write(args)

		const keys = new Set<string>()
		for (const { key } of args.set ?? []) keys.add(key)
		for (const key of args.delete ?? []) keys.add(key)

		// Write cache ranges so we can read our writes.
		const ranges = Array.from(keys).map(keyToRange)

		for (const range of ranges) {
			sortedRanges.insert(this.cachedRanges, range)
		}

		// Emit
		this.emit(ranges)
	}
}

export function keyToRange(key: string) {
	return { gte: key, lte: key }
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
