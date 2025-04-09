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
