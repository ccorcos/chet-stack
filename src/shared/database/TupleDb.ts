import { codec } from "./Codec"
import {
	EncodeSubspaceListArgs,
	KeyDecodeList,
	KeyEncodeOKV,
	KeyEncodeWrite,
	TupleSubspaceEncoder,
	ValueEncodeOKV,
} from "./Encoder"
import { Transaction } from "./Transaction"
import { BaseOKV, BaseTupleOKV, ReadOnlyTupleDb, Tuple, TupleDb, TupleTx } from "./types"

export function tupleOkv(okv: BaseOKV<string, string>): BaseTupleOKV {
	return ValueEncodeOKV(KeyEncodeOKV(okv, codec), {
		encode: (value) => JSON.stringify(value),
		decode: (value) => JSON.parse(value),
	})
}

function subspace(db: BaseTupleOKV, prefix: Tuple): BaseTupleOKV {
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
export function tupleDb(db: BaseTupleOKV): TupleDb {
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

export function tupleTx(db: BaseTupleOKV): TupleTx {
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
