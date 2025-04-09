/*

Back to first principles.
We're going to start with just solving the problem, and then worry about performance later.

https://www.notion.so/chetcorcos/Local-Caching-1698d4136624809a876ddfb66d16ef35
*/

import { orderedArray } from "@ccorcos/ordered-array"
import { identity } from "lodash"
import { compactObj } from "../compactObj"
import { compare as cmp } from "../compare"
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
} from "./Range"
import { RangeEmitter } from "./RangeEmitter"
import { BaseOKVCache, CacheListResult, ListArgs, WriteArgs } from "./types"

export class Cache<K = string, V = any> implements BaseOKVCache<K, V> {
	data: InMemoryBaseOKV<K, V>
	emitter: RangeEmitter<K>
	cachedRanges: Range<K>[] = []

	constructor(public compare: (a: K, b: K) => number = cmp) {
		this.data = new InMemoryBaseOKV<K, V>(compare)
		this.emitter = new RangeEmitter(compare)
	}

	subscribe = (range: Range<K>, fn: () => void) => this.emitter.subscribe(range, fn)
	emit = (ranges: Range<K>[]) => this.emitter.emit(ranges)

	// ==========================================================================
	// Helpers for dealing with ordered arrays.
	// ==========================================================================

	get orderedRanges() {
		return orderedArray<Range<K>>(identity, (a, b) => compareRange(a, b, this.compare))
	}

	get orderedKeys() {
		return orderedArray(identity, this.compare)
	}

	/**
	 * Insert data into the cache that was returned from a list query.
	 * TODO: eventually we want to track versions of keys so we don't clobber
	 * optimistic writes
	 */
	insert(args: ListArgs<K>, result: { key: K; value: V }[]) {
		const range = computeCachedRange(args, result)
		this.orderedRanges.insert(this.cachedRanges, range)

		// Delete any previous data in that range.
		const setKeys: K[] = []
		for (const { key } of result) setKeys.push(key)

		const deleteKeys: K[] = []
		const existing = this.data.list(range)

		for (const { key } of existing)
			if (this.orderedKeys.search(setKeys, key).found === undefined) deleteKeys.push(key)

		this.data.write({ set: result, delete: Array.from(deleteKeys) })

		this.emitter.emit([range])
	}

	list(args: ListArgs<K>): CacheListResult<K, V> {
		const range = encodeRange(args)

		const eq = (a: Bound<K>, b: Bound<K>) => compareBound(a, b, this.compare) === 0
		const gt = (a: Bound<K>, b: Bound<K>) => compareBound(a, b, this.compare) === 1
		const gte = (a: Bound<K>, b: Bound<K>) => compareBound(a, b, this.compare) !== -1
		const lt = (a: Bound<K>, b: Bound<K>) => compareBound(a, b, this.compare) === -1
		const lte = (a: Bound<K>, b: Bound<K>) => compareBound(a, b, this.compare) !== 1

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
		for (const { key } of args.set ?? []) this.orderedKeys.insert(keys, key)
		for (const key of args.delete ?? []) this.orderedKeys.insert(keys, key)

		// Write cache ranges so we can read our writes.
		const ranges = Array.from(keys).map(keyToRange)

		for (const range of ranges) {
			this.orderedRanges.insert(this.cachedRanges, range)
		}

		// Emit
		this.emit(ranges)
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
