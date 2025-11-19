import { insert, remove, search } from "@ccorcos/ordered-array"
import { compare as cmp } from "shared/compare"
import { Okv } from "./types"

export class InMemoryOkv<K = string | number, V = any> implements Okv<K, V> {
	data: { key: K; value: V }[] = []

	constructor(public compare: (a: K, b: K) => number = cmp) {}

	list = (
		args: {
			gt?: K
			gte?: K
			lt?: K
			lte?: K
			offset?: number
			limit?: number
			reverse?: boolean
		} = {}
	): { key: K; value: V }[] => {
		if (args.gt !== undefined && args.gte !== undefined)
			throw new Error("Invalid bounds: {gt, gte}")
		if (args.lt !== undefined && args.lte !== undefined)
			throw new Error("Invalid bounds: {lt, lte}")

		if (
			args.gte !== undefined &&
			args.lte !== undefined &&
			this.compare(args.gte, args.lte) === 0
		) {
			// Performance optimization: special case "get" a single key.
			const key = args.gte
			const result = search(this.data, key, ({ key }) => key, this.compare)
			if (result.found === undefined) return []
			return [this.data[result.found]]
		}

		const start = args.gt ?? args.gte
		const startOpen = args.gt !== undefined
		const end = args.lt ?? args.lte
		const endOpen = args.lt !== undefined

		if (start !== undefined && end !== undefined) {
			const comp = this.compare(start, end)
			if (comp > 0) {
				console.warn("Invalid bounds.", args)
				return []
			}
			if (comp === 0 && (startOpen || endOpen)) {
				console.warn("Invalid bounds.", args)
				return []
			}
		}

		if (this.data.length === 0) return []

		let startIndex = 0
		if (start !== undefined) {
			const result = search(this.data, start, ({ key }) => key, this.compare)
			if (result.found !== undefined) {
				if (startOpen) startIndex = result.found + 1
				else startIndex = result.found
			} else startIndex = result.closest
		}

		let endIndex = this.data.length
		if (end !== undefined) {
			const result = search(this.data, end, ({ key }) => key, this.compare)
			if (result.found !== undefined) {
				if (endOpen) endIndex = result.found
				else endIndex = result.found + 1
			} else endIndex = result.closest
		}

		const result = this.data.slice(startIndex, endIndex)
		if (args.reverse) result.reverse()
		if (args.offset) result.splice(0, args.offset)
		if (args.limit) result.splice(args.limit - (args.offset || 0), result.length)
		return result
	}

	write = (tx: { set?: { key: K; value: V }[]; delete?: K[] }) => {
		for (const key of tx.delete || []) {
			remove(this.data, key, ({ key }) => key, this.compare)
		}
		for (const { key, value } of tx.set || []) {
			insert(this.data, { key, value }, ({ key }) => key, this.compare)
		}
	}
}
