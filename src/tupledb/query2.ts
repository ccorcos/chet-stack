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
	JSONValue,
	ListArgs,
	ListOp,
	Op,
	SyncOKV,
	Tuple,
	WriteArgs,
	WriteOp,
} from "./types2"

// ============================================================================
// Generator placeholders for the actual storage.
// ============================================================================

export type OKV<K, V, SK = K, SV = V> = {
	list(args?: ListArgs<K>): Generator<Op<SK, SV>, { key: K; value: V }[], any>
	write: (tx: WriteArgs<K, V>) => Generator<Op<SK, SV>, void, any>
	all: <T>(args: Array<Generator<Op<SK, SV>, T, any>>) => Generator<Op<SK, SV>, Awaited<T>[], any>
}

export function okv<K, V>(): OKV<K, V> {
	return {
		*list(args?: ListArgs<K>) {
			const op: ListOp<K> = {
				fn: "list",
				args: args !== undefined ? [args] : [],
			}
			const result: { key: K; value: V }[] = yield op
			return result
		},

		*write(tx: WriteArgs<K, V>) {
			const op: WriteOp<K, V> = { fn: "write", args: [tx] }
			yield op
			return
		},

		*all<T>(gens: Array<Generator<Op<K, V>, T, any>>): Generator<Op<K, V>, Awaited<T>[], any> {
			const results: Awaited<T>[] = yield gens
			return results
		},
	}
}

// ============================================================================
// Running generators.
// ============================================================================

export function runSync<K, V, T>(db: SyncOKV<K, V>, gen: Generator<Op<K, V>, T, any>): T {
	let step = gen.next()
	while (!step.done) {
		const value = step.value

		// Handle array of generators (for parallel execution)
		if (Array.isArray(value)) {
			const results = value.map((g) => runSync(db, g))
			step = gen.next(results)
		} else {
			// Handle single operation
			const { fn, args } = value as { fn: string; args: any[] }
			const result = db[fn](...args)
			step = gen.next(result)
		}
	}
	return step.value
}

export async function runAsync<K, V, T>(
	db: AsyncOKV<K, V>,
	gen: Generator<Op<K, V>, T, any>
): Promise<T> {
	let step = gen.next()
	while (!step.done) {
		const value = step.value

		// Handle array of generators (for parallel execution)
		if (Array.isArray(value)) {
			const results = await Promise.all(value.map((g) => runAsync(db, g)))
			step = gen.next(results)
		} else {
			// Handle single operation
			const { fn, args } = value as { fn: string; args: any[] }
			const result = await db[fn](...args)
			step = gen.next(result)
		}
	}
	return step.value
}

// ============================================================================
// Encoders for generators.
// ============================================================================

export function ValueEncode<K, I, O, SK, SV>(
	db: OKV<K, O, SK, SV>,
	encoder: Encoder<I, O>
): OKV<K, I, SK, SV> {
	return {
		*list(args): Generator<Op<SK, SV>, { key: K; value: I }[], any> {
			const results = yield* db.list(args)
			return results.map(({ key, value }) => ({
				key,
				value: encoder.decode(value),
			}))
		},

		*write(tx): Generator<Op<SK, SV>, void, any> {
			const encodedTx = {
				set: tx.set?.map(({ key, value }) => ({
					key,
					value: encoder.encode(value),
				})),
				delete: tx.delete,
			}
			yield* db.write(encodedTx)
		},

		all: db.all,
	}
}

export function KeyEncode<I, O, V, SK, SV>(
	db: OKV<O, V, SK, SV>,
	encoder: KeyEncoder<I, O>
): OKV<I, V, SK, SV> {
	return {
		*list(args): any {
			const newArgs = KeyEncodeListArgs(args || {}, encoder)
			const results = yield* db.list(newArgs)
			return KeyDecodeList(results, encoder)
		},

		*write(args): any {
			const newArgs = KeyEncodeWrite(args, encoder)
			yield* db.write(newArgs)
		},

		all: db.all,
	}
}

export function tupleOkv(okv: OKV<string, string>): OKV<Tuple, JSONValue, string, string> {
	return ValueEncode(KeyEncode(okv, codec), {
		encode: (value) => JSON.stringify(value),
		decode: (value) => JSON.parse(value),
	})
}

function subspace<SK, SV>(
	db: OKV<Tuple, JSONValue, SK, SV>,
	prefix: Tuple
): OKV<Tuple, JSONValue, SK, SV> {
	const encoder = TupleSubspaceEncoder(prefix)
	return {
		*list(args): Generator<Op<SK, SV>, { key: Tuple; value: JSONValue }[], any> {
			const newArgs = EncodeSubspaceListArgs(args || {}, prefix)
			const result = yield* db.list(newArgs)
			return KeyDecodeList(result, encoder)
		},
		*write(args): Generator<Op<SK, SV>, void, any> {
			const newArgs = KeyEncodeWrite(args, encoder)
			yield* db.write(newArgs)
		},
		all: db.all,
	}
}

export type TupleDb<SK, SV> = OKV<Tuple, JSONValue, SK, SV> & {
	get: (key: Tuple) => Generator<Op<SK, SV>, JSONValue | undefined, any>
	has: (key: Tuple) => Generator<Op<SK, SV>, boolean, any>
	set: (key: Tuple, value: JSONValue) => Generator<Op<SK, SV>, void, any>
	delete: (key: Tuple) => Generator<Op<SK, SV>, void, any>
	subspace: (prefix: Tuple) => TupleDb<SK, SV>
}

export function tupleDb<SK, SV>(db: OKV<Tuple, JSONValue, SK, SV>): TupleDb<SK, SV> {
	const { list, write } = db
	return {
		list,
		write,
		all: db.all,
		*get(key) {
			const results = yield* db.list({ gte: key, lte: key })
			return results.at(0)?.value
		},
		*has(key) {
			const results = yield* db.list({ gte: key, lte: key })
			return results.length > 0
		},
		*set(key, value) {
			yield* db.write({ set: [{ key, value }] })
		},
		*delete(key) {
			yield* db.write({ delete: [key] })
		},
		subspace(prefix: Tuple) {
			return tupleDb(subspace(db, prefix))
		},
	}
}

// const qdb = tupleDb(tupleOkv(db))

// // We can use it though to build queries like this.
// function* scoreboard2(limit: number) {
// 	const scores = yield* qdb.subspace(["score"]).list({ limit, reverse: true })
// 	const results = yield* qdb.all(
// 		scores.map(function* ({ value: { userId, score } }) {
// 			const [{ value: user }] = yield* qdb.list({ gte: ["user", userId], lte: ["user", userId] })
// 			return { user, score }
// 		})
// 	)

// 	yield* qdb.set(["score", "1"], { userId: "user:1", score: 100 })

// 	return results
// }

// const syncScore2 = syncStorage.run(scoreboard2(10))
// const asyncScore2 = await asyncStorage.run(scoreboard2(10))

// export function tupleTx(db: BaseTupleOKV): TupleTx {
// 	const baseTx = new Transaction(db)
// 	const sugar = tupleDb(baseTx)
// 	return {
// 		...sugar,
// 		compare: baseTx.compare,
// 		list: baseTx.list,
// 		write: baseTx.write,
// 		commit: baseTx.commit,
// 		get committed() {
// 			return baseTx.committed
// 		},
// 	}
// }

// export function readOnlyTupleDb(db: TupleDb | TupleTx): ReadOnlyTupleDb {
// 	const { compare, list, get, has } = db
// 	return { compare, list, get, has, subspace: (args) => readOnlyTupleDb(db.subspace(args)) }
// }

// ============================================================================
// Demo
// ============================================================================

// // This is really just a placeholder for the actual storage because all this does
// // functionally is yield. It also carries the types around. This storage type must
// // match the actual sync or async storage we run with it eventually.
// const db = okv<string, any>()

// // We can use it though to build queries like this.
// function* scoreboard1(limit: number) {
// 	const scores = yield* db.list({ gte: "score:", lte: "score:\xff", limit, reverse: true })
// 	const results = yield* db.all(
// 		scores.map(function* ({ value: { userId, score } }) {
// 			const [{ value: user }] = yield* db.list({ gte: userId, lte: userId })
// 			return { user, score }
// 		})
// 	)
// 	return results
// }

// const syncScore = runSync(db, scoreboard1(10))
// const asyncScore = await runAsync(db, scoreboard1(10))
