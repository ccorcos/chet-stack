/*

Uses a cache under the hood to leverage the optimistic writes logic.
It's going to cache all the data read during a transaction so that could blow up memory.
When the cache returns a prefix, we'll transparently read the rest of the data from the database.

*/

import { InMemoryOkv } from "./InMemoryOkv"
import { Range } from "./Range"
import { ListArgs, Okv, OkvTx, WriteArgs } from "./types"

export class Transaction<K, V> implements OkvTx<K, V> {
	committed = false

	pending: {
		set: InMemoryOkv<K, V>
		delete: InMemoryOkv<K, null>
	}

	constructor(public db: Okv<K, V>) {
		this.pending = {
			set: new InMemoryOkv(this.db.compare),
			delete: new InMemoryOkv(this.db.compare),
		}
	}

	get compare() {
		return this.db.compare
	}

	/**
	 * This version will overfetch as needed to satisfy the limit in a single request.
	 * An alternative approach would not overfetch but will need to make multiple requests.
	 */
	list = (args: ListArgs<K> = {}): { key: K; value: V }[] => {
		if (this.committed) throw new Error("Transaction already committed")

		const range: Range<K> = {
			gt: args.gt,
			gte: args.gte,
			lt: args.lt,
			lte: args.lte,
		}

		const fetchArgs = { ...args }
		if (fetchArgs.limit !== undefined) {
			// If fetching range [A,B] with limit N, then all the delete could be at the beginning
			// of that range and all the sets could be at the end of the range, after the limit.
			// Thus in the worst case, we need to overfetch the number of deletes in that range.
			const deletes = this.pending.delete.list(range)
			fetchArgs.limit += deletes.length
		}

		// First read the data from the database.
		const data = this.db.list(fetchArgs)

		// Overwrite with pending data.
		const slice = new InMemoryOkv<K, V>(this.db.compare)
		slice.write({ set: data })
		slice.write({
			// Only select from the range we actually need.
			set: this.pending.set.list(range),
			delete: this.pending.delete.list(range).map(({ key }) => key),
		})

		// Select what we need from the slice.
		return slice.list(args)
	}

	write = (args: WriteArgs<K, V>) => {
		if (this.committed) throw new Error("Transaction already committed")
		this.pending.set.write({ set: args.set, delete: args.delete })
		this.pending.delete.write({
			set: args.delete?.map((key) => ({ key, value: null })),
			delete: args.set?.map(({ key }) => key) ?? [],
		})
	}

	commit = () => {
		if (this.committed) throw new Error("Transaction already committed")
		this.committed = true
		this.db.write({
			set: this.pending.set.list(),
			delete: this.pending.delete.list().map(({ key }) => key),
		})
	}
}
