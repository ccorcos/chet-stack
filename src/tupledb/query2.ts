import { compare as cmp } from "shared/compare"
import { sleep } from "shared/sleep"
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
import { InMemoryBaseOKV } from "./InMemoryBaseOKV"
import {
	AsyncStorageOKV,
	JSONValue,
	ListArgs,
	ListOp,
	Op,
	SyncStorageOKV,
	Tuple,
	WriteArgs,
	WriteOp,
} from "./types2"

export type TQuery<K, V, SK = K, SV = V> = {
	list(args?: ListArgs<K>): Generator<Op<SK, SV>, { key: K; value: V }[], any>
	write: (tx: WriteArgs<K, V>) => Generator<Op<SK, SV>, void, any>
	all: <T>(args: Array<Generator<Op<SK, SV>, T, any>>) => Generator<Op<SK, SV>, Awaited<T>[], any>
}

class Query<K, V> implements TQuery<K, V> {
	*list(args?: ListArgs<K>) {
		const op: ListOp<K> = {
			fn: "list",
			args: args !== undefined ? [args] : [],
		}
		const result: { key: K; value: V }[] = yield op
		return result
	}

	*write(tx: WriteArgs<K, V>) {
		const op: WriteOp<K, V> = { fn: "write", args: [tx] }
		yield op
		return
	}

	*all<T>(gens: Array<Generator<Op<K, V>, T, any>>): Generator<Op<K, V>, Awaited<T>[], any> {
		const results: Awaited<T>[] = yield gens
		return results
	}
}

// This is really just a placeholder for the actual storage because all this does
// functionally is yield. It also carries the types around. This storage type must
// match the actual sync or async storage we run with it eventually.
const db = new Query<string, any>()

// We can use it though to build queries like this.
function* scoreboard1(limit: number) {
	const scores = yield* db.list({ gte: "score:", lte: "score:\xff", limit, reverse: true })
	const results = yield* db.all(
		scores.map(function* ({ value: { userId, score } }) {
			const [{ value: user }] = yield* db.list({ gte: userId, lte: userId })
			return { user, score }
		})
	)
	return results
}

class SyncStorage<K, V> implements SyncStorageOKV<K, V> {
	db: InMemoryBaseOKV<K, V>
	constructor(public compare: (a: K, b: K) => number = cmp) {
		this.db = new InMemoryBaseOKV<K, V>(compare)
	}

	list = (args?: ListArgs<K>): { key: K; value: V }[] => this.db.list(args)
	write = (tx: WriteArgs<K, V>) => this.db.write(tx)

	/**
	 * Synchronously executes a generator by interpreting yielded operations.
	 */
	run<T>(gen: Generator<Op<K, V>, T, unknown>): T {
		let step = gen.next()
		while (!step.done) {
			const value = step.value

			// Handle array of generators (for parallel execution)
			if (Array.isArray(value)) {
				const results = value.map((g) => this.run(g))
				step = gen.next(results)
			} else {
				// Handle single operation
				const { fn, args } = value as { fn: string; args: any[] }
				const result = this[fn](...args)
				step = gen.next(result)
			}
		}
		return step.value
	}
}

class AsyncStorage<K, V> implements AsyncStorageOKV<K, V> {
	db: InMemoryBaseOKV<K, V>
	constructor(public compare: (a: K, b: K) => number = cmp) {
		this.db = new InMemoryBaseOKV<K, V>(compare)
	}

	list = async (args?: ListArgs<K>): Promise<{ key: K; value: V }[]> => {
		await sleep(100)
		return this.db.list(args)
	}
	write = async (tx: WriteArgs<K, V>): Promise<void> => {
		await sleep(100)
		this.db.write(tx)
	}

	/**
	 * Asynchronously executes a generator by interpreting yielded operations.
	 */
	async run<T>(gen: Generator<Op<K, V>, T, any>): Promise<T> {
		let step = gen.next()
		while (!step.done) {
			const value = step.value

			// Handle array of generators (for parallel execution)
			if (Array.isArray(value)) {
				const results = await Promise.all(value.map((g) => this.run(g)))
				step = gen.next(results)
			} else {
				// Handle single operation
				const { fn, args } = value as { fn: string; args: any[] }
				const result = await (this as any)[fn](...args)
				step = gen.next(result)
			}
		}
		return step.value
	}
}

const syncStorage = new SyncStorage<string, any>()
const asyncStorage = new AsyncStorage<string, any>()

const syncScore = syncStorage.run(scoreboard1(10))
const asyncScore = await asyncStorage.run(scoreboard1(10))

// ============================================================================
// Now lets layer on the tuple abstractions.
// ============================================================================

export function ValueEncodeOKV<K, I, O, SK, SV>(
	db: TQuery<K, O, SK, SV>,
	encoder: Encoder<I, O>
): TQuery<K, I, SK, SV> {
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

export function KeyEncodeOKV<I, O, V, SK, SV>(
	db: TQuery<O, V, SK, SV>,
	encoder: KeyEncoder<I, O>
): TQuery<I, V, SK, SV> {
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

export function tupleOkv(okv: TQuery<string, string>): TQuery<Tuple, JSONValue, string, string> {
	return ValueEncodeOKV(KeyEncodeOKV(okv, codec), {
		encode: (value) => JSON.stringify(value),
		decode: (value) => JSON.parse(value),
	})
}

function subspace<SK, SV>(
	db: TQuery<Tuple, JSONValue, SK, SV>,
	prefix: Tuple
): TQuery<Tuple, JSONValue, SK, SV> {
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

export type QueryTupleDb<SK, SV> = TQuery<Tuple, JSONValue, SK, SV> & {
	get: (key: Tuple) => Generator<Op<SK, SV>, JSONValue | undefined, any>
	has: (key: Tuple) => Generator<Op<SK, SV>, boolean, any>
	set: (key: Tuple, value: JSONValue) => Generator<Op<SK, SV>, void, any>
	delete: (key: Tuple) => Generator<Op<SK, SV>, void, any>
	subspace: (prefix: Tuple) => QueryTupleDb<SK, SV>
}

/**
 * Separating the sugar from the base api makes it a lot easier to build compositional
 * abstractions because the base layer is the only two functions we need to wrap.
 */
export function tupleDb<SK, SV>(db: TQuery<Tuple, JSONValue, SK, SV>): QueryTupleDb<SK, SV> {
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

const qdb = tupleDb(tupleOkv(db))

// We can use it though to build queries like this.
function* scoreboard2(limit: number) {
	const scores = yield* qdb.subspace(["score"]).list({ limit, reverse: true })
	const results = yield* qdb.all(
		scores.map(function* ({ value: { userId, score } }) {
			const [{ value: user }] = yield* qdb.list({ gte: ["user", userId], lte: ["user", userId] })
			return { user, score }
		})
	)

	yield* qdb.set(["score", "1"], { userId: "user:1", score: 100 })

	return results
}

const syncScore2 = syncStorage.run(scoreboard2(10))
const asyncScore2 = await asyncStorage.run(scoreboard2(10))

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
