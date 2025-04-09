import { Cache } from "./Cache"
import { BaseOKV, BaseOKVTransaction, ListArgs, WriteArgs } from "./types"

export class Transaction<K, V> implements BaseOKVTransaction<K, V> {
	cache: Cache<K, V>
	writes: { set: { key: K; value: V }[]; delete: K[] } = { set: [], delete: [] }

	constructor(public db: BaseOKV<K, V>) {
		this.cache = new Cache<K, V>(this.db.compare)
	}

	get compare() {
		return this.db.compare
	}

	get data() {
		return this.cache.data
	}

	get ranges() {
		return this.cache.ranges
	}

	list(args: ListArgs<K> = {}): { key: K; value: V }[] {
		const result = this.cache.list(args)

		if (result.hit) {
			return result.hit
		}

		if (result.prefix && result.prefix.length > 0) {
			if (args.reverse) {
				const restArgs = { ...args }
				delete restArgs.lt
				delete restArgs.lte
				if (restArgs.limit) restArgs.limit -= result.prefix.length
				restArgs.lt = result.prefix.at(-1)!.key
				const restResult = this.db.list(restArgs)
				this.cache.insert(restArgs, restResult)
				return [...result.prefix, ...restResult]
			} else {
				const restArgs = { ...args }
				delete restArgs.gt
				delete restArgs.gte
				if (restArgs.limit) restArgs.limit -= result.prefix.length
				restArgs.gt = result.prefix.at(-1)!.key
				const restResult = this.db.list(restArgs)
				this.cache.insert(restArgs, restResult)
				return [...result.prefix, ...restResult]
			}
		}

		// MISS
		const data = this.db.list(args)
		this.cache.insert(args, data)
		return data
	}

	write(args: WriteArgs<K, V>) {
		this.cache.write(args)
		this.writes = {
			set: [...this.writes.set!, ...(args.set ?? [])],
			delete: [...this.writes.delete!, ...(args.delete ?? [])],
		}
	}

	committed = false
	commit = () => {
		if (this.committed) throw new Error("Transaction already committed")
		this.committed = true
		this.db.write(this.writes)
	}
}
