import { compare } from "shared/compare"
import { InMemoryOkv } from "./InMemoryOkv"
import { compareRange, overlapsRange, Range } from "./Range"

/**
 * Consider looking at TupleRangeTree too
 * TODO: make overlap query more efficient.
 */
export class RangeTree<B, K, V> {
	ranges: InMemoryOkv<[Range<B>, K], V>
	// Inverse index, using 0 and 1 to represent MIN and MAX for prefix list queries.
	keys: InMemoryOkv<[K, Range<B> | 0 | 1], V>

	constructor(
		public compareBound: (a: B, b: B) => number = compare,
		public compareKey: (a: K, b: K) => number = compare
	) {
		this.ranges = new InMemoryOkv<[Range<B>, K]>((a, b) => {
			const d = compareRange(a[0], b[0], this.compareBound)
			if (d !== 0) return d
			return compareKey(a[1], b[1])
		})
		this.keys = new InMemoryOkv<[K, Range<B> | 0 | 1], V>((a, b) => {
			const d = compareKey(a[0], b[0])
			if (d !== 0) return d
			if (typeof a[1] === "number" || typeof b[1] === "number") {
				if (a[1] === b[1]) return 0
				if (a[1] === 0 || b[1] === 1) return -1
				if (a[1] === 1 || b[1] === 0) return 1
			}
			return compareRange(a[1], b[1], this.compareBound)
		})
	}

	set = (args: { range: Range<B>; key: K; value: V }) => {
		const { range, key, value } = args
		this.ranges.write({ set: [{ key: [range, key], value }] })
		this.keys.write({ set: [{ key: [key, range], value: value }] })
	}

	delete = (args: { key: K; range?: Range<B> }) => {
		let { key, range } = args

		// Delete all ranges.
		if (range === undefined) {
			const results = this.keys.list({ gt: [key, 0], lt: [key, 1] })
			for (const item of results) {
				const [key, range] = item.key
				this.ranges.write({ delete: [[range as Range<B>, key]] })
			}
			return
		}

		// Delete just a single range.
		this.ranges.write({ delete: [[range, key]] })
		this.keys.write({ delete: [[key, range]] })
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
