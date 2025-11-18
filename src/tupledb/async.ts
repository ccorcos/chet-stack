import { Cache } from "./Cache"
import { codec } from "./Codec"
import {
	Encoder,
	EncodeSubspaceListArgs,
	KeyDecodeList,
	KeyEncodeListArgs,
	KeyEncoder,
	KeyEncodeWrite,
	TupleSubspaceEncoder,
} from "./Encoder"
import {
	AsyncOKV,
	AsyncTupleDb,
	AsyncTupleTx,
	JSONValue,
	ListArgs,
	Tuple,
	WriteArgs,
} from "./types"

function KeyEncode<I, O, V>(db: AsyncOKV<O, V>, encoder: KeyEncoder<I, O>): AsyncOKV<I, V> {
	return {
		compare: encoder.compare,
		async list(args) {
			const newArgs = KeyEncodeListArgs(args || {}, encoder)
			const results = await db.list(newArgs)
			return KeyDecodeList(results, encoder)
		},
		async write(args) {
			const newArgs = KeyEncodeWrite(args, encoder)
			await db.write(newArgs)
		},
	}
}

function ValueEncode<K, I, O>(db: AsyncOKV<K, O>, encoder: Encoder<I, O>): AsyncOKV<K, I> {
	return {
		compare: db.compare,
		async list(args) {
			const results = await db.list(args)
			return results.map(({ key, value }) => ({ key, value: encoder.decode(value) }))
		},
		write(tx: { set?: { key: K; value: I }[]; delete?: K[] }) {
			return db.write({
				set: tx.set?.map(({ key, value }) => ({ key, value: encoder.encode(value) })),
				delete: tx.delete,
			})
		},
	}
}

export function encodeTupleKey<V>(okv: AsyncOKV<string, V>): AsyncOKV<Tuple, V> {
	return KeyEncode(okv, codec)
}

export function encodeJsonValue<K>(okv: AsyncOKV<K, string>): AsyncOKV<K, JSONValue> {
	return ValueEncode(okv, {
		encode: (value) => JSON.stringify(value),
		decode: (value) => JSON.parse(value),
	})
}

export function tupleOkv(okv: AsyncOKV<string, string>): AsyncOKV<Tuple, JSONValue> {
	return encodeJsonValue(encodeTupleKey(okv))
}

function subspace(db: AsyncOKV<Tuple, JSONValue>, prefix: Tuple): AsyncOKV<Tuple, JSONValue> {
	const encoder = TupleSubspaceEncoder(prefix)
	return {
		compare: db.compare,
		async list(args = {}) {
			const result = await db.list(EncodeSubspaceListArgs(args, prefix))
			return KeyDecodeList(result, encoder)
		},
		async write(args) {
			await db.write(KeyEncodeWrite(args, encoder))
		},
	}
}

/**
 * Separating the sugar from the base api makes it a lot easier to build compositional
 * abstractions because the base layer is the only two functions we need to wrap.
 */
export function tupleDb(db: AsyncOKV<Tuple, JSONValue>): AsyncTupleDb {
	const { compare, list, write } = db
	return {
		compare,
		list,
		write,
		get: async (key) => (await db.list({ gte: key, lte: key })).at(0)?.value,
		has: async (key) => (await db.list({ gte: key, lte: key })).length > 0,
		set: (key, value) => db.write({ set: [{ key, value }] }),
		delete: (key) => db.write({ delete: [key] }),
		subspace: (prefix) => tupleDb(subspace(db, prefix)),
	}
}

class AsyncTransaction<K, V> implements AsyncOKV<K, V> {
	committed = false
	cache: Cache<K, V>

	constructor(public db: AsyncOKV<K, V>) {
		this.cache = new Cache<K, V>(this.db.compare)
	}

	get compare() {
		return this.db.compare
	}

	list = async (args: ListArgs<K> = {}): Promise<{ key: K; value: V }[]> => {
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

				const restResult = await this.db.list(restArgs)
				this.cache.insert(restArgs, restResult)

				// Don't return yet, because we may have pending writes in the new range.
				// Instead, we'll call list again from the cache.
			} else {
				const restArgs = { ...args }
				delete restArgs.gt
				delete restArgs.gte
				if (restArgs.limit) restArgs.limit -= result.prefix.length
				restArgs.gt = result.prefix.at(-1)!.key

				const restResult = await this.db.list(restArgs)
				this.cache.insert(restArgs, restResult)

				// Don't return yet, because we may have pending writes in the new range.
				// Instead, we'll call list again from the cache.
			}
		}

		if (result.miss) {
			const data = await this.db.list(args)
			this.cache.insert(args, data)

			// Don't return data, because we may have pending writes in the new range.
		}

		const again = this.cache.list(args)
		if (!again.hit) throw new Error("Cache should have hit")
		return again.hit
	}

	write = async (args: WriteArgs<K, V>): Promise<void> => {
		if (this.committed) throw new Error("Transaction already committed")
		this.cache.write(args)
	}

	commit = async () => {
		if (this.committed) throw new Error("Transaction already committed")
		this.committed = true
		await this.db.write({
			set: this.cache.pending.set.list(),
			delete: this.cache.pending.delete.list().map(({ key }) => key),
		})
	}
}

export function tupleTx(db: AsyncOKV<Tuple, JSONValue>): AsyncTupleTx {
	const baseTx = new AsyncTransaction(db)
	return {
		...tupleDb(baseTx),
		compare: baseTx.compare,
		list: baseTx.list,
		write: baseTx.write,
		commit: baseTx.commit,
		get committed() {
			return baseTx.committed
		},
	}
}
