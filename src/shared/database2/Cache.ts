/*

Back to first principles.
We're going to start with just solving the problem, and then worry about performance later.

https://www.notion.so/chetcorcos/Local-Caching-1698d4136624809a876ddfb66d16ef35
*/

import { orderedArray } from "@ccorcos/ordered-array"
import { identity } from "lodash"
import { compactObj } from "../compactObj"
import { compare } from "../compare"
import { reverse } from "../reverse"
import { InMemoryBaseOKV } from "./InMemoryBaseOKV"
import {
	Bound,
	compareBound,
	compareRange,
	decodeEndBound,
	decodeStartBound,
	encodeRange,
	Range,
} from "./range"
import { ListArgs, WriteArgs } from "./types"

export type CacheListResult<K = any, V = any> = {
	miss?: true
	hit?: { key: K; value: V }[]
	prefix?: { key: K; value: V }[]
}

export class Cache<K, V> {
	data: InMemoryBaseOKV<K, V>

	private sortedRanges: ReturnType<typeof orderedArray<Range<K>>>
	cachedRanges: Range<K>[] = []

	constructor(public compareKey: (a: K, b: K) => number = compare) {
		this.data = new InMemoryBaseOKV<K, V>(this.compareKey)
		// this.listeners = new RangeEmitter<K>(this.compareKey)
		this.sortedRanges = orderedArray<Range<K>>(identity, (a, b) => compareRange(a, b, compareKey))
	}

	// TODO: track versions and don't clobber optimistic writes.
	insert(args: ListArgs<K>, result: { key: K; value: V }[]) {
		const range = computeCachedRange(args, result)
		this.sortedRanges.insert(this.cachedRanges, range)

		// Delete any previous data in that range.
		const deleteKeys: K[] = []
		const existing = this.data.list(range)
		for (const { key: a } of existing) {
			const exists = result.some(({ key: b }) => this.compareKey(a, b) === 0)
			if (!exists) deleteKeys.push(a)
		}

		this.data.write({ set: result, delete: deleteKeys })
		// this.listeners.emit([range])
	}

	list(args: ListArgs<K>): CacheListResult<K, V> {
		const range = encodeRange(args)

		const eq = (a: Bound<K>, b: Bound<K>) => compareBound(a, b, this.compareKey) === 0
		const gt = (a: Bound<K>, b: Bound<K>) => compareBound(a, b, this.compareKey) === 1
		const gte = (a: Bound<K>, b: Bound<K>) => compareBound(a, b, this.compareKey) !== -1
		const lt = (a: Bound<K>, b: Bound<K>) => compareBound(a, b, this.compareKey) === -1
		const lte = (a: Bound<K>, b: Bound<K>) => compareBound(a, b, this.compareKey) !== 1

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

	write(args: WriteArgs<K, V>) {
		// Optimistic write
		this.data.write(args)

		const keys: K[] = []
		for (const { key } of args.set ?? []) keys.push(key)
		for (const key of args.delete ?? []) keys.push(key)

		// Write cache ranges so we can read our writes.
		const ranges = Array.from(keys).map(keyToRange)

		for (const range of ranges) {
			this.sortedRanges.insert(this.cachedRanges, range)
		}

		// Emit
		// this.listeners.emit(ranges)
	}
}

export function keyToRange<K>(key: K) {
	return { gte: key, lte: key }
}

export function computeCachedRange<K, V>(
	args: ListArgs<K>,
	result: { key: K; value: V }[]
): Range<K> {
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
