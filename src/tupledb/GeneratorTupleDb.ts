/*

Exploring an idea where the generator concept reaches deep into the database abstraction.

*/

import { compare as cmp } from "shared/compare"
import { sleep } from "shared/sleep"
import { InMemoryBaseOKV } from "./InMemoryBaseOKV"
import { Range } from "./Range"

export type Tuple = any[]
export type JSONValue = any

export type WriteArgs<K, V> = { set?: { key: K; value: V }[]; delete?: K[] }

export type ListOptions = {
	limit?: number
	// offset?: number
	reverse?: boolean
}

export type ListArgs<K> = Range<K> & ListOptions

type ListOp<K> = { fn: "list"; args: [] | [ListArgs<K>] }
type WriteOp<K, V> = { fn: "write"; args: [WriteArgs<K, V>] }
type Op<K, V> = ListOp<K> | WriteOp<K, V> | Generator<Op<K, V>, any, any>[]

/**
 * Compare is important so that we can do other in-memory things, e.g. caching reads
 * and writes in a transaction. Otherwise it's just read and write.
 */
export type BaseOKV<K, V> = {
	compare: (a: K, b: K) => number
	list(args?: ListArgs<K>): Generator<ListOp<K>, { key: K; value: V }[], any>
	write: (tx: WriteArgs<K, V>) => Generator<WriteOp<K, V>, void, any>
	all: <T>(args: Array<Generator<any, T, any>>) => Generator<any, Awaited<T>[], any>
}

export type CacheListResult<K, V> = {
	miss?: true
	hit?: { key: K; value: V }[]
	prefix?: { key: K; value: V }[]
}

/**
 * This type is useful for implementing subspace. We intentionally don't include the
 * data or the ranges of the cache on this type so we can create a subspace without
 * copying all that data.
 */
export type BaseOKVCache<K, V> = {
	insert: (args: ListArgs<K>, result: { key: K; value: V }[]) => void
	compare: (a: K, b: K) => number
	list: (args: ListArgs<K>) => CacheListResult<K, V>
	listRaw: (args: ListArgs<K>) => { key: K; value: V }[]
	write: (args: WriteArgs<K, V>) => () => void
	subscribe: (range: Range<K>, fn: () => void) => () => void
}

/**
 * Similar to BaseOKVCache, this is useful for building compositional abstractions.
 * But in other situations you're going to want the actual Transaction class so that
 * you can inspect the pending writes, etc.
 */
export type BaseOKVTx<K, V> = BaseOKV<K, V> & {
	committed: boolean
	commit: () => Generator<WriteOp<K, V>, void, unknown>
}

// ==========================================================================
// TupleDb
// ==========================================================================

export type BaseTupleOKV = BaseOKV<Tuple, JSONValue>
export type BaseTupleOKVTx = BaseOKVTx<Tuple, JSONValue>

export type TupleDb = BaseTupleOKV & {
	get: (key: Tuple) => Generator<ListOp<Tuple>, { key: Tuple; value: JSONValue }[], unknown>
	has: (key: Tuple) => Generator<ListOp<Tuple>, boolean, unknown>
	set: (key: Tuple, value: JSONValue) => Generator<WriteOp<Tuple, JSONValue>, void, unknown>
	delete: (key: Tuple) => Generator<WriteOp<Tuple, JSONValue>, void, unknown>
	subspace: (prefix: Tuple) => TupleDb
}

export type ReadOnlyTupleDb = Pick<TupleDb, "compare" | "list" | "get" | "has"> & {
	subspace: (prefix: Tuple) => ReadOnlyTupleDb
}

export type TupleTx = BaseTupleOKVTx & {
	get: (key: Tuple) => Generator<ListOp<Tuple>, { key: Tuple; value: JSONValue }[], unknown>
	has: (key: Tuple) => Generator<ListOp<Tuple>, boolean, unknown>
	set: (key: Tuple, value: JSONValue) => void
	delete: (key: Tuple) => void
	// Reverts back to TupleDb to avoid committing within the subspace.
	subspace: (prefix: Tuple) => TupleDb
}

export type SyncStorageOKV<K, V> = {
	compare: (a: K, b: K) => number
	list(args?: ListArgs<K>): { key: K; value: V }[]
	write(tx: WriteArgs<K, V>): void
	run<T>(gen: Generator<Op<K, V>, T, unknown>): T
}

export type AsyncStorageOKV<K, V> = {
	compare: (a: K, b: K) => number
	list(args?: ListArgs<K>): Promise<{ key: K; value: V }[]>
	write(tx: WriteArgs<K, V>): Promise<void>
	run<T>(gen: Generator<Op<K, V>, T, unknown>): Promise<T>
}

class SyncOKV<K, V> implements SyncStorageOKV<K, V> {
	db: InMemoryBaseOKV<K, V>
	constructor(public compare: (a: K, b: K) => number = cmp) {
		this.db = new InMemoryBaseOKV<K, V>(compare)
	}

	list(args?: ListArgs<K>): { key: K; value: V }[] {
		return this.db.list(args)
	}
	write(tx: WriteArgs<K, V>): void {
		this.db.write(tx)
	}

	run<T>(gen: Generator<Op<K, V>, T, unknown>): T {
		let step = gen.next()
		while (!step.done) {
			const { fn, args } = step.value as { fn: string; args: any[] }
			step = gen.next(this[fn](...args))
		}
		return step.value
	}
}

class AsyncOKV<K, V> implements AsyncStorageOKV<K, V> {
	db: InMemoryBaseOKV<K, V>
	constructor(public compare: (a: K, b: K) => number = cmp) {
		this.db = new InMemoryBaseOKV<K, V>(compare)
	}

	async list(args?: ListArgs<K>): Promise<{ key: K; value: V }[]> {
		await sleep(100)
		return this.db.list(args)
	}
	async write(tx: WriteArgs<K, V>): Promise<void> {
		await sleep(100)
		this.db.write(tx)
	}

	async run<T>(gen: Generator<Op<K, V>, T, unknown>): Promise<T> {
		let step = gen.next()
		while (!step.done) {
			const { fn, args } = step.value as { fn: string; args: any[] }
			step = gen.next(await this[fn](...args))
		}
		return step.value
	}
}

function* scoreboard(tx: BaseOKV<string, any>, limit: number) {
	const scores = yield* tx.list({ gte: "score:", lte: "score:\xff", limit, reverse: true })
	const results = yield* tx.all(
		scores.map(function* ({ value: { userId, score } }) {
			const [{ value: user }] = yield* tx.list({ gte: userId, lte: userId })
			return { user, score }
		})
	)
	return results
}

const syncOkv = new SyncOKV<string, any>()
const asyncOkv = new AsyncOKV<string, any>()

class BaseOKVGen<K, V> implements BaseOKV<K, V> {
	constructor(public compare: (a: K, b: K) => number = cmp) {}
	*list(args?: ListArgs<K>) {
		const x = yield { fn: "list", args: [args] } as ListOp<K>
		return x as { key: K; value: V }[]
	}

	*write(tx: WriteArgs<K, V>) {
		yield { fn: "write", args: [tx] } as WriteOp<K, V>
		return
	}

	*all<T>(args: Array<Generator<any, T, any>>): Generator<any, Awaited<T>[], any> {
		const results = yield args
		return results
	}
}

const baseOkv = new BaseOKVGen<string, any>()

const syncResult = syncOkv.run(scoreboard(baseOkv, 10))
const asyncResult = asyncOkv.run(scoreboard(baseOkv, 10))

console.log(syncResult)
console.log(asyncResult)

/*

I want the convenience of writing as we normally have while also having this query abstraction for interopability.

We should call this parallel world QueryOKV etc.


*/
