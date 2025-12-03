// Goals...
// - use and Okv for storing ranges
// - reuse this in RangeEmitter
// - reuse this in cache.ranged
// - compute overlaps in various ways.

import { compare } from "shared/compare"
import { InMemoryOkv } from "./InMemoryOkv"
import { compareRange, overlapsRange, Range } from "./Range"

/**
 * Ideas for later...
 * - current a single unique key must have only one range. but we could change that...
 * - can we store both the ranges and the inverse index in the same okv and make it durable?
 * - can we make `overlaps` more efficient with a proper interval tree?
 */
export class RangeTree<B, K, V> {
	ranges: InMemoryOkv<[Range<B>, K], V>
	// Inverse index.
	keys: InMemoryOkv<K, { range: Range<B>; value: V }>

	constructor(
		public compareBound: (a: B, b: B) => number = compare,
		public compareKey: (a: K, b: K) => number = compare
	) {
		this.ranges = new InMemoryOkv<[Range<B>, K]>((a, b) => {
			const d = compareRange(a[0], b[0], this.compareBound)
			if (d !== 0) return d
			return compareKey(a[1], b[1])
		})
		this.keys = new InMemoryOkv<K, { range: Range<B>; value: V }>(compareKey)
	}

	set = (args: { range: Range<B>; key: K; value: V }) => {
		const { range, key, value } = args
		this.ranges.write({ set: [{ key: [range, key], value }] })
		this.keys.write({ set: [{ key, value: { range, value } }] })
	}

	delete = (args: { key: K; range?: Range<B> }) => {
		let { key, range } = args
		if (range === undefined) {
			const result = this.keys.list({ gte: key, lte: key }).at(0)
			if (result === undefined) return
			range = result.value.range
		}
		this.ranges.write({ delete: [[range, key]] })
		this.keys.write({ delete: [key] })
	}

	overlap = (range: Range<B> = {}) => {
		const result: { range: Range<B>; key: K; value: V }[] = []
		for (const { key, value } of this.ranges.list()) {
			if (overlapsRange(key[0], range, this.compareBound)) {
				result.push({ range: key[0], key: key[1], value })
			}
		}
		return result
	}
}
