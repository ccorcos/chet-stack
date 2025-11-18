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

// ==========================================================================
// Base OKV types.
// ==========================================================================

export type SyncOKV<K, V> = {
	compare: (a: K, b: K) => number
	list(args?: ListArgs<K>): { key: K; value: V }[]
	write: (tx: WriteArgs<K, V>) => void
}

export type AsyncOKV<K, V> = {
	compare: (a: K, b: K) => number
	list(args?: ListArgs<K>): Promise<{ key: K; value: V }[]>
	write: (tx: WriteArgs<K, V>) => Promise<void>
}

export type SyncTupleDb = SyncOKV<Tuple, JSONValue> & {
	get: (key: Tuple) => JSONValue | undefined
	has: (key: Tuple) => boolean
	set: (key: Tuple, value: JSONValue) => void
	delete: (key: Tuple) => void
	subspace: (prefix: Tuple) => SyncTupleDb
}

export type AsyncTupleDb = AsyncOKV<Tuple, JSONValue> & {
	get: (key: Tuple) => Promise<JSONValue | undefined>
	has: (key: Tuple) => Promise<boolean>
	set: (key: Tuple, value: JSONValue) => Promise<void>
	delete: (key: Tuple) => Promise<void>
	subspace: (prefix: Tuple) => AsyncTupleDb
}

// ==========================================================================
// Generator OKV.
// ==========================================================================

export type ListOp<K> = { fn: "list"; args: [] | [ListArgs<K>] }
export type WriteOp<K, V> = { fn: "write"; args: [WriteArgs<K, V>] }
export type Op<K, V> = ListOp<K> | WriteOp<K, V> | Generator<Op<K, V>, any, any>[]

/** SK and SV are the persisted types. */
export type OKV<K, V, SK = K, SV = V> = {
	compare: (a: K, b: K) => number
	list(args?: ListArgs<K>): Generator<Op<SK, SV>, { key: K; value: V }[], any>
	write: (tx: WriteArgs<K, V>) => Generator<Op<SK, SV>, void, any>
	all: <T>(args: Array<Generator<Op<SK, SV>, T, any>>) => Generator<Op<SK, SV>, Awaited<T>[], any>
}

export type TupleDb<SK, SV> = OKV<Tuple, JSONValue, SK, SV> & {
	get: (key: Tuple) => Generator<Op<SK, SV>, JSONValue | undefined, any>
	has: (key: Tuple) => Generator<Op<SK, SV>, boolean, any>
	set: (key: Tuple, value: JSONValue) => Generator<Op<SK, SV>, void, any>
	delete: (key: Tuple) => Generator<Op<SK, SV>, void, any>
	subspace: (prefix: Tuple) => TupleDb<SK, SV>
}

// ==========================================================================
// Tx
// ==========================================================================

export type SyncTupleTx = SyncTupleDb & {
	subspace: (prefix: Tuple) => SyncTupleDb
	commit: () => void
	committed: boolean
}

export type AsyncTupleTx = AsyncTupleDb & {
	subspace: (prefix: Tuple) => AsyncTupleDb
	commit: () => Promise<void>
	committed: boolean
	// Writes are local within the transaction.
	set: (key: Tuple, value: JSONValue) => void
	delete: (key: Tuple) => void
}

/**
 * Similar to CacheOKC, this is useful for building compositional abstractions.
 * But in other situations you're going to want the actual Transaction class so that
 * you can inspect the pending writes, etc.
 */
export type SyncOKVTx<K, V> = SyncOKV<K, V> & {
	committed: boolean
	commit: () => void
}

export type AsyncOKVTx<K, V> = AsyncOKV<K, V> & {
	committed: boolean
	commit: () => Promise<void>
}

export type QueryOKVTx<K, V> = OKV<K, V> & {
	committed: boolean
	commit: () => Generator<any, void, any>
}

// ==========================================================================
// Cache
// ==========================================================================

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
export type CacheOKV<K, V> = {
	insert: (args: ListArgs<K>, result: { key: K; value: V }[]) => void
	compare: (a: K, b: K) => number
	list: (args: ListArgs<K>) => CacheListResult<K, V>
	listRaw: (args: ListArgs<K>) => { key: K; value: V }[]
	write: (args: WriteArgs<K, V>) => () => void
	subscribe: (range: Range<K>, fn: () => void) => () => void
}

// ==========================================================================
// TupleDb
// ==========================================================================

// export type ReadOnlySyncTupleDb = {
// 	compare: (a: Tuple, b: Tuple) => number
// 	list(args?: ListArgs<Tuple>): { key: Tuple; value: JSONValue }[]
// 	get: (key: Tuple) => JSONValue | undefined
// 	has: (key: Tuple) => boolean
// 	subspace: (prefix: Tuple) => ReadOnlySyncTupleDb
// }

// export type ReadOnlyAsyncTupleDb = {
// 	compare: (a: Tuple, b: Tuple) => number
// 	list(args?: ListArgs<Tuple>): Promise<{ key: Tuple; value: JSONValue }[]>
// 	get: (key: Tuple) => Promise<JSONValue | undefined>
// 	has: (key: Tuple) => Promise<boolean>
// 	subspace: (prefix: Tuple) => ReadOnlyAsyncTupleDb
// }

// export type ReadOnlyQueryTupleDb = {
// 	compare: (a: Tuple, b: Tuple) => number
// 	list(args?: ListArgs<Tuple>): Generator<any, { key: Tuple; value: JSONValue }[], any>
// 	get: (key: Tuple) => Generator<any, JSONValue | undefined, any>
// 	has: (key: Tuple) => Generator<any, boolean, any>
// 	subspace: (prefix: Tuple) => ReadOnlyQueryTupleDb
// }

// export type QueryTupleTx = QueryTupleOKVTx & {
// 	get: (key: Tuple) => Generator<any, JSONValue | undefined, any>
// 	has: (key: Tuple) => Generator<any, boolean, any>
// 	// These are cached locally in the transaction.
// 	set: (key: Tuple, value: JSONValue) => void
// 	delete: (key: Tuple) => void
// 	subspace: (prefix: Tuple) => QueryTupleOKVTx
// }
