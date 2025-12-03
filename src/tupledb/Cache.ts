/*

Back to first principles.
We're going to start with just solving the problem, and then worry about performance later.

https://www.notion.so/chetcorcos/Local-Caching-1698d4136624809a876ddfb66d16ef35
*/

import { uniqWith } from "lodash-es"
import { compactObj } from "shared/compactObj"
import { compare as cmp } from "shared/compare"
import { OrderedList } from "shared/OrderedList"
import { reverse } from "shared/reverse"
import { InMemoryOkv } from "./InMemoryOkv"
import {
	Bound,
	compareBound,
	compareRange,
	decodeEndBound,
	decodeStartBound,
	encodeEndBound,
	encodeRange,
	encodeStartBound,
	Range,
} from "./Range"
import { RangeEmitter } from "./RangeEmitter"
import { Transaction } from "./Transaction"
import { CacheListResult, ListArgs, OkvCache, WriteArgs } from "./types"

/**
 * The Cache keeps track of which data ranges are in the cache and respond with hit/miss/prefix.
 * It also handles reactivity and optimistic writes.
 */
export class Cache<K, V> implements OkvCache<K, V> {
	data: InMemoryOkv<K, V>
	emitter: RangeEmitter<K>
	ranges: OrderedList<Range<K>>

	refs: OrderedList<{ key: K; ref: number }, K>

	pending: Transaction<K, V>

	constructor(public compare: (a: K, b: K) => number = cmp) {
		this.data = new InMemoryOkv<K, V>(compare)
		this.emitter = new RangeEmitter(compare)
		this.ranges = new OrderedList<Range<K>>([], (a, b) => compareRange(a, b, this.compare))

		this.pending = new Transaction(this.data)

		this.refs = new OrderedList<{ key: K; ref: number }, K>([], compare, ({ key }) => key)
	}

	subscribe = (range: Range<K>, fn: () => void) => this.emitter.subscribe(range, fn)
	emit = (ranges: Range<K>[]) => this.emitter.emit(ranges)

	// ==========================================================================
	// Helpers for dealing with ordered arrays.
	// ==========================================================================

	insert = (args: ListArgs<K>, result: { key: K; value: V }[]) => {
		const range = cachedRange(args, result)
		this.ranges.insert(range)

		const tx = new Transaction(this.data)
		// Delete the existing range.
		tx.write({ delete: tx.list(range).map(({ key }) => key) })
		// Overwrite with new data.
		tx.write({ set: result })
		tx.commit()

		// Optimistic writes are still in this.pending sitting on top of this.data.
		this.emitter.emit([range])
	}

	listRaw = (args: ListArgs<K>): { key: K; value: V }[] => this.pending.list(args)

	list = (args: ListArgs<K>): CacheListResult<K, V> => {
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
			for (const range of this.ranges.items) {
				const [left, right] = encodeRange(range)
				if (gt(left, cursor)) return { miss: true }
				if (lt(right, cursor)) continue
				const result = this.pending.list(args)
				return { hit: result }
			}
		}

		if (args.reverse) {
			// REVERSE
			let miss = true
			let cursor = range[1]
			for (const r of reverse(this.ranges.items)) {
				const [start, end] = encodeRange(r)
				if (lte(start, cursor) && gte(end, cursor)) {
					miss = false
					if (r.gte !== undefined) {
						// If this range starts with gte, then the next range can start with lt and the result is continuous.
						cursor = encodeEndBound({ lt: r.gte })
					} else {
						cursor = start
					}
					if (lte(start, range[0])) break
				}
				// No early exit because the list is ordered by start, not end and we're going in reverse.
			}

			// MISS
			if (miss) return { miss: true }

			// PREFIX
			if (gt(cursor, range[0])) {
				const { gt, gte } = decodeStartBound(cursor)
				const result = this.pending.list({ ...args, gt, gte })

				if (args.limit !== undefined && result.length === args.limit) {
					// COVERED
					return { hit: result }
				}

				return { prefix: result }
			}

			// HIT
			return { hit: this.pending.list(args) }
		}

		// FORWARD
		let miss = true
		let cursor = range[0]
		for (const r of this.ranges.items) {
			const [start, end] = encodeRange(r)
			if (lte(start, cursor) && gte(end, cursor)) {
				miss = false
				if (r.lte !== undefined) {
					// If this range ends with lte, then the next range can start with gt and the result is continuous.
					cursor = encodeStartBound({ gt: r.lte })
				} else {
					cursor = end
				}
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
			const result = this.pending.list({ ...args, lt, lte })

			if (args.limit !== undefined && result.length === args.limit) {
				// COVERED
				return { hit: result }
			}

			return { prefix: result }
		}

		// HIT
		return { hit: this.pending.list(args) }
	}

	write = (args: WriteArgs<K, V>) => {
		// Optimistic write
		this.pending.write(args)

		// Reference count pending writes.
		const setKeys = args.set?.map(({ key }) => key) ?? []
		const deleteKeys = args.delete ?? []
		const allKeys = uniqWith([...setKeys, ...deleteKeys], (a, b) => this.compare(a, b) === 0)
		for (const key of allKeys) {
			this.refs.update(key, (existing) => {
				if (existing === undefined) return { key, ref: 1 }
				return { key, ref: existing.ref + 1 }
			})
		}

		// Write cache ranges so we can read our writes.
		const ranges = allKeys.map(keyToRange)
		for (const range of ranges) this.ranges.insert(range)

		// Emit
		this.emit(ranges)

		return () => {
			// Finalize pending write reference count so that new data can overwrite it from the server.
			const deref: K[] = []
			for (const key of allKeys) {
				this.refs.update(key, (existing) => {
					if (existing === undefined) return console.warn("Ref count is should be non-zero!")
					if (existing.ref === 1) {
						deref.push(key)
						return undefined
					}
					return { key, ref: existing.ref - 1 }
				})
			}

			// NOTE: we aren't committing the transaction because there could have been more writes
			// in the meantime.

			// Commit to the underlying database.
			const sets = deref.flatMap((key) => this.pending.pending.set.list({ gte: key, lte: key }))
			const deletes = deref.flatMap((key) =>
				this.pending.pending.delete.list({ gte: key, lte: key }).map(({ key }) => key)
			)
			this.data.write({ set: sets, delete: deletes })

			// Clear pending writes from the transaction.
			this.pending.pending.set.write({ delete: deref })
			this.pending.pending.delete.write({ delete: deref })
		}
	}
}

export function keyToRange<K>(key: K) {
	return { gte: key, lte: key }
}

/**
 * List args can have a limit. And so we need to consider the results of the request in order to
 * determine what range of data we actually read into the cache.
 */
export function cachedRange<K, V>(args: ListArgs<K>, result: { key: K; value: V }[]): Range<K> {
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
