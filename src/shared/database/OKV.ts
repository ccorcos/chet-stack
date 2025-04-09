import { codec } from "./Codec"
import {
	EncodeSubspaceListArgs,
	KeyDecodeList,
	KeyEncodeOKV,
	KeyEncodeWrite,
	TupleSubspaceEncoder,
	ValueEncodeOKV,
} from "./Encoder"
import { BaseOKV, ListOptions, SugarTupleDb, Tuple, TupleDb } from "./types"

export function tuplejson(okv: BaseOKV<string, string>): TupleDb {
	return ValueEncodeOKV(KeyEncodeOKV(okv, codec), {
		encode: (value) => JSON.stringify(value),
		decode: (value) => JSON.parse(value),
	})
}

function subspace(db: TupleDb, prefix: Tuple): TupleDb {
	const encoder = TupleSubspaceEncoder(prefix)
	return {
		compare: db.compare,
		list: (args = {}) => {
			const result = db.list(EncodeSubspaceListArgs(args, prefix))
			return KeyDecodeList(result, encoder)
		},
		write: (args) => {
			return db.write(KeyEncodeWrite(args, encoder))
		},
	}
}

/**
 * Separating the sugar from the base api makes it a lot easier to build compositional
 * abstractions because the base layer is the only two functions we need to wrap.
 */
export function sugar(db: TupleDb): SugarTupleDb {
	return {
		...db,
		get: (key) => db.list({ gte: key, lte: key }).at(0)?.value,
		prefix: (prefix, options: ListOptions = {}) =>
			db.list({ ...options, gt: prefix, lte: [...prefix, ...Array(10).fill(null)] }),
		subspace: (prefix) => sugar(subspace(db, prefix)),

		set: (key, value) => db.write({ set: [{ key, value }] }),
		delete: (key) => db.write({ delete: [key] }),
	}
}

// export class Transaction<K, V> implements BaseOKV<K, V> {
// 	data: InMemoryBaseOKV<K, V>
// 	reads: Range<K>[] = []
// 	// writes: WriteArgs<K, V> = { set: [], delete: [] }

// 	constructor(public db: BaseOKV<K, V>) {
// 		this.data = new InMemoryBaseOKV<K, V>(this.db.compare)
// 	}

// 	compare = (a: K, b: K) => this.db.compare(a, b)

// 	list(args: ListArgs<K> = {}): { key: K; value: V }[] {
// 		this.reads.push(args)
// 		const data = this.db.list(args)
// 		this.data.write({ set: data })
// 		return data
// 	}

// 	write(args: WriteArgs<K, V>) {
// 		throw new Error("Not implemented")
// 		// this.writes = {
// 		// 	set: [...this.writes.set!, ...(args.set ?? [])],
// 		// 	delete: [...this.writes.delete!, ...(args.delete ?? [])],
// 		// }
// 	}

// 	commit = () => {
// 		throw new Error("Not implemented")
// 		// this.db.write(this.writes)
// 	}
// }
