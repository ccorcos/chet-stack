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

/**
 * Compare is important so that we can do other in-memory things, e.g. caching reads
 * and writes in a transaction. Otherwise it's just read and write.
 */
export type Okv<K, V> = {
	compare: (a: K, b: K) => number
	list(args?: ListArgs<K>): { key: K; value: V }[]
	write: (tx: WriteArgs<K, V>) => void
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
export type OkvCache<K, V> = {
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
export type OkvTx<K, V> = Okv<K, V> & {
	committed: boolean
	commit: () => void
}

// ==========================================================================
// TupleDb
// ==========================================================================

export type TupleOkv = Okv<Tuple, JSONValue>
export type TupleOkvTx = OkvTx<Tuple, JSONValue>

export type ReadOnlyTupleDb = {
	compare: (a: Tuple, b: Tuple) => number
	list(args?: ListArgs<Tuple>): { key: Tuple; value: JSONValue }[]
	get: (key: Tuple) => JSONValue | undefined
	has: (key: Tuple) => boolean
	subspace: (prefix: Tuple) => ReadOnlyTupleDb
}

export type TupleDb = TupleOkv & {
	get: (key: Tuple) => JSONValue | undefined
	has: (key: Tuple) => boolean
	set: (key: Tuple, value: JSONValue) => void
	delete: (key: Tuple) => void
	subspace: (prefix: Tuple) => TupleDb
}

export type TupleTx = TupleOkvTx & {
	get: (key: Tuple) => JSONValue | undefined
	has: (key: Tuple) => boolean
	set: (key: Tuple, value: JSONValue) => void
	delete: (key: Tuple) => void
	// Reverts back to TupleDb to avoid committing with the subspace.
	subspace: (prefix: Tuple) => TupleDb
}

// ==========================================================================
// TODO: maybe remove this...

export type Index = {
	id: string
	// secondary indexes are 0, tertiary indexes are 1.
	order: number
	range: ListArgs<Tuple>
	set: (db: TupleOkv, key: Tuple, value: JSONValue) => void
	delete: (db: TupleOkv, key: Tuple) => void
}

export type IndexableOKV = {
	createIndex(index: Index): void
	deleteIndex(id: string): void
}
