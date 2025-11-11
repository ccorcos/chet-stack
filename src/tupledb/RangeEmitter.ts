import { compare } from "shared/compare"
import { OrderedList } from "shared/OrderedList"
import { randomId } from "shared/randomId"
import { compareRange, overlapsRange, Range } from "./Range"

export type RangeListener<K> = { range: Range<K>; id: string; fn: () => void }

export class RangeEmitter<K> {
	// TODO: optimize this with an interval tree.
	listeners: OrderedList<RangeListener<K>>

	constructor(public compareKey: (a: K, b: K) => number = compare) {
		const compareListener = (a: RangeListener<K>, b: RangeListener<K>) => {
			const dir = compareRange(a.range, b.range, compareKey)
			if (dir !== 0) return dir
			return compare(a.id, b.id)
		}

		this.listeners = new OrderedList<RangeListener<K>>([], compareListener)
	}

	subscribe = (range: Range<K>, fn: () => void) => {
		const listener = { range, id: randomId(), fn }
		this.listeners.insert(listener)
		return () => {
			this.listeners.remove(listener)
		}
	}

	emit = (ranges: Range<K>[]) => {
		const fns = new Set<() => void>()
		for (const r of ranges) {
			for (const { range, fn } of this.listeners.items) {
				if (overlapsRange(r, range, this.compareKey)) fns.add(fn)
			}
		}
		for (const fn of fns) fn()
	}
}
