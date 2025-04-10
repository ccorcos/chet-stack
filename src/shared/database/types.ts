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

export type BaseOKV<K, V> = {
	compare: (a: K, b: K) => number
	list(args?: ListArgs<K>): { key: K; value: V }[]
	write: (tx: WriteArgs<K, V>) => void
}

export type CacheListResult<K, V> = {
	miss?: true
	hit?: { key: K; value: V }[]
	prefix?: { key: K; value: V }[]
}

export type BaseOKVCache<K, V> = {
	// data: BaseOKV<K, V> // Data in the cache.
	// ranges: OrderedList<Range<K>> // Ranges if data in the cache.
	insert: (args: ListArgs<K>, result: { key: K; value: V }[]) => void

	compare: (a: K, b: K) => number
	list: (args: ListArgs<K>) => CacheListResult<K, V>
	write: (args: WriteArgs<K, V>) => () => void

	subscribe: (range: Range<K>, fn: () => void) => () => void
}

export type BaseOKVTransaction<K, V> = BaseOKV<K, V> & {
	// data: BaseOKV<K, V> // Data in the cache.
	// ranges: Range<K>[] // Ranges if data in the cache.
	writes: { set: { key: K; value: V }[]; delete: K[] }
	committed: boolean
	commit: () => void
}

export type SugarOKV<K, V> = BaseOKV<K, V> & {
	get: (key: K) => V | undefined
	prefix: (prefix: K) => { key: K; value: V }[]
	subspace(prefix: K): SugarOKV<K, V>
	set: (key: K, value: V) => void
	delete: (key: K) => void
}

export type TupleDb = BaseOKV<Tuple, JSONValue>
export type SugarTupleDb = SugarOKV<Tuple, JSONValue>

//
//
//
//
//
//
//
//
//
//

export type Index = {
	id: string
	// secondary indexes are 0, tertiary indexes are 1.
	order: number
	range: ListArgs<Tuple>
	set: (db: TupleDb, key: Tuple, value: JSONValue) => void
	delete: (db: TupleDb, key: Tuple) => void
}

export type IndexableOKV = {
	createIndex(index: Index): void
	deleteIndex(id: string): void
}
