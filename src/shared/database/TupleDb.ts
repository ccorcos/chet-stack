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
import {
	BaseOKV,
	BaseTupleOKV,
	BaseTupleOKVTx,
	ReadOnlyTupleDb,
	Tuple,
	TupleDb,
	TupleTx,
} from "./types"

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
		transact: () => {
			const tx = new Transaction(db)
			const { list, write, ...rest } = tupleTx(tx)
			return {
				...rest,
				list: tx.list,
				write: tx.write,
				commit: tx.commit,
				get committed() {
					return tx.committed
				},
			}
		},
	}
}

export function readOnlyTupleDb(db: TupleDb | TupleTx): ReadOnlyTupleDb {
	const { compare, list, get, has } = db
	return { compare, list, get, has, subspace: (args) => readOnlyTupleDb(db.subspace(args)) }
}

export function tupleTx(tx: BaseTupleOKVTx): TupleTx {
	const { compare, list, write, commit } = tx
	return {
		compare,
		list,
		write,
		commit,
		get committed() {
			return tx.committed
		},
		get: (key) => tx.list({ gte: key, lte: key }).at(0)?.value,
		has: (key) => tx.list({ gte: key, lte: key }).length > 0,
		set: (key, value) => tx.write({ set: [{ key, value }] }),
		delete: (key) => tx.write({ delete: [key] }),
		subspace: (prefix) =>
			tupleTx({
				commit: () => {
					throw new Error("The transaction cannot be committed by a transaction subspace.")
				},
				get committed() {
					return tx.committed
				},
				...subspace(tx, prefix),
			}),
	}
}

function isTx(tx: TupleDb | TupleTx): tx is TupleTx {
	return "committed" in tx
}

/**
 * Helper function writing composable transactions.
 */
export function transact<I extends any[], O>(fn: (tx: TupleTx, ...args: I) => O) {
	return (tx: TupleDb | TupleTx, ...args: I) => {
		if (isTx(tx)) return fn(tx, ...args)

		const { commit, ...rest } = tx.transact()

		const result = fn(
			{
				...rest,
				commit: () => {
					throw new Error("This transaction will be committed by the caller.")
				},
			},
			...args
		)

		commit()

		return result
	}
}
