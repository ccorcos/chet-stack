import { Cache } from "./Cache"
import { BaseOKV, BaseOKVTx, ListArgs, WriteArgs } from "./types"

export class Transaction<K, V> implements BaseOKVTx<K, V> {
	committed = false
	cache: Cache<K, V>

	constructor(public db: BaseOKV<K, V>) {
		this.cache = new Cache<K, V>(this.db.compare)
	}

	get compare() {
		return this.db.compare
	}

	list = (args: ListArgs<K> = {}): { key: K; value: V }[] => {
		if (this.committed) throw new Error("Transaction already committed")
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

				// Don't return yet, because we may have pending writes in the new range.
				// Instead, we'll call list again from the cache.
				// return [...result.prefix, ...restResult]
			} else {
				const restArgs = { ...args }
				delete restArgs.gt
				delete restArgs.gte
				if (restArgs.limit) restArgs.limit -= result.prefix.length
				restArgs.gt = result.prefix.at(-1)!.key

				const restResult = this.db.list(restArgs)
				this.cache.insert(restArgs, restResult)

				// Don't return yet, because we may have pending writes in the new range.
				// Instead, we'll call list again from the cache.
				// return [...result.prefix, ...restResult]
			}
		}

		if (result.miss) {
			const data = this.db.list(args)
			this.cache.insert(args, data)

			// Don't return data, because we may have pending writes in the new range.
		}

		const again = this.cache.list(args)
		if (!again.hit) throw new Error("Cache should have hit")
		return again.hit
	}

	write = (args: WriteArgs<K, V>) => {
		if (this.committed) throw new Error("Transaction already committed")
		this.cache.write(args)
	}

	commit = () => {
		if (this.committed) throw new Error("Transaction already committed")
		this.committed = true
		console.log("HERE")
		this.db.write({
			set: this.cache.pending.set.list(),
			delete: this.cache.pending.delete.list().map(({ key }) => key),
		})
	}
}
