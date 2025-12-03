/*

Use functional composition to build the layers.

OKV -> TupleOKV -> TupleDb -> TupleTx

const db = tupleDb(tupleOkv(stringOkv))
const tx = tupleTx(db)

*/

import { codec } from "./Codec"
import {
	EncodeSubspaceListArgs,
	KeyDecodeList,
	KeyEncodeOKV,
	KeyEncodeWrite,
	TupleSubspaceEncoder,
	ValueEncodeOKV,
} from "./Encoder"
import { InMemoryOkv } from "./InMemoryOkv"
import { Transaction } from "./Transaction"
import { Okv, ReadOnlyTupleDb, Tuple, TupleDb, TupleOkv, TupleTx } from "./types"

export function tupleOkv(okv?: Okv<string, string>): TupleOkv {
	if (!okv) okv = new InMemoryOkv(codec.compare)
	return ValueEncodeOKV(KeyEncodeOKV(okv, codec), {
		encode: (value) => JSON.stringify(value),
		decode: (value) => JSON.parse(value),
	})
}

export function subspace(db: TupleOkv, prefix: Tuple): TupleOkv {
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
export function tupleDb(db?: TupleOkv): TupleDb {
	if (!db) db = tupleOkv()
	const { compare, list, write } = db
	return {
		compare,
		list,
		write,
		get: (key) => db.list({ gte: key, lte: key }).at(0)?.value,
		has: (key) => db.list({ gte: key, lte: key }).length > 0,
		set: (key, value) => db.write({ set: [{ key, value }] }),
		delete: (key) => db.write({ delete: [key] }),
		subspace: (prefix) => tupleDb(subspace(db, prefix)),
	}
}

export function readOnlyTupleDb(db: TupleDb | TupleTx): ReadOnlyTupleDb {
	const { compare, list, get, has } = db
	return { compare, list, get, has, subspace: (args) => readOnlyTupleDb(db.subspace(args)) }
}

export function tupleTx(db: TupleOkv): TupleTx {
	const baseTx = new Transaction(db)
	const sugar = tupleDb(baseTx)
	return {
		...sugar,
		compare: baseTx.compare,
		list: baseTx.list,
		write: baseTx.write,
		commit: baseTx.commit,
		get committed() {
			return baseTx.committed
		},
	}
}
