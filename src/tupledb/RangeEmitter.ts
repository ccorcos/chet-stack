import { compare } from "shared/compare"
import { randomId } from "shared/randomId"
import { Range } from "./Range"
import { RangeTree } from "./RangeTree"

export type RangeListener<K> = { range: Range<K>; id: string; fn: () => void }

export class RangeEmitter<K> {
	listeners: RangeTree<K, string, () => void>

	constructor(public compareBound: (a: K, b: K) => number = compare) {
		this.listeners = new RangeTree<K, string, () => void>(compareBound)
	}

	subscribe = (range: Range<K>, value: () => void) => {
		const key = randomId()
		this.listeners.set({ range, key, value })
		return () => this.listeners.delete({ key, range })
	}

	emit = (ranges: Range<K>[]) => {
		const fns = new Set<() => void>()
		for (const r of ranges) {
			const results = this.listeners.overlap(r)
			for (const { value } of results) fns.add(value)
		}
		for (const fn of fns) fn()
	}
}
