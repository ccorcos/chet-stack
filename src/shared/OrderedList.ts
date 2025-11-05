import { insert, remove, search, update } from "@ccorcos/ordered-array"
import { identity } from "lodash-es"
import { compare as cmp } from "./compare"

export class OrderedList<T, K = T> {
	constructor(
		public items: T[] = [],
		public compare: (a: K, b: K) => number = cmp,
		public select: (item: T) => K = identity
	) {}

	search = (key: K) => search(this.items, key, this.select, this.compare)
	has = (key: K) => this.search(key).found !== undefined
	insert = (item: T) => insert(this.items, item, this.select, this.compare)
	update = (key: K, fn: (existing: T | undefined) => T | undefined | void) =>
		update(this.items, key, fn, this.select, this.compare)
	remove = (key: K) => remove(this.items, key, this.select, this.compare)
}
