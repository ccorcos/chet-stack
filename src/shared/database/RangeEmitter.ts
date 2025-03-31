import { orderedArray } from "@ccorcos/ordered-array"
import { identity } from "lodash"
import { compare } from "../compare"
import { randomId } from "../randomId"
import { compareRange, overlapsRange, Range } from "./Range"

export type RangeListener<K> = { range: Range<K>; id: string; fn: () => void }

export class RangeEmitter<K> {
	// TODO: optimize this with an interval tree.
	listeners: RangeListener<K>[] = []

	sorted: ReturnType<typeof orderedArray<RangeListener<K>>>

	constructor(public compareKey: (a: K, b: K) => number = compare) {
		const compareListener = (a: RangeListener<K>, b: RangeListener<K>) => {
			const dir = compareRange(a.range, b.range, compareKey)
			if (dir !== 0) return dir
			return compare(a.id, b.id)
		}

		this.sorted = orderedArray<RangeListener<K>>(identity, compareListener)
	}

	subscribe = (range: Range<K>, fn: () => void) => {
		const listener = { range, id: randomId(), fn }
		this.sorted.insert(this.listeners, listener)
		return () => {
			this.sorted.remove(this.listeners, listener)
		}
	}

	emit = (ranges: Range<K>[]) => {
		const fns = new Set<() => void>()
		for (const r of ranges) {
			for (const { range, fn } of this.listeners) {
				if (overlapsRange(r, range, this.compareKey)) fns.add(fn)
			}
		}
		for (const fn of fns) fn()
	}
}
