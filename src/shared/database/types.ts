import { Range } from "./Range"

export type Tuple = any[]
export type JSONValue = any

export type WriteArgs<K = any, V = any> = { set?: { key: K; value: V }[]; delete?: K[] }

export type ListOptions = {
	limit?: number
	offset?: number
	reverse?: boolean
}

export type ListArgs<K = any> = Range<K> & ListOptions

export type BaseOKV<K = any, V = any> = {
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
	compare: (a: K, b: K) => number
	list: (args: ListArgs<K>) => CacheListResult<K, V>
	write: (args: WriteArgs<K, V>) => void

	subscribe: (range: Range<K>, fn: () => void) => () => void
	insert: (args: ListArgs<K>, result: { key: K; value: V }[]) => void
}

export type SugarOKV<K = any, V = any> = BaseOKV<K, V> & {
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

export type Index<K = any, V = any> = {
	id: string
	// secondary indexes are 0, tertiary indexes are 1.
	order: number
	range: ListArgs<K>
	set: (db: OKV<K, V>, key: K, value: V) => void
	delete: (db: OKV<K, V>, key: K) => void
}

export type IndexableOKV<K = any, V = any> = {
	createIndex(index: Index<K, V>): void
	deleteIndex(id: string): void
}
