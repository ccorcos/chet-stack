import { Range } from "./Range"

export type Tuple = any[]
export type JSONValue = any

export type WriteArgs<K = any, V = any> = { set?: { key: K; value: V }[]; delete?: K[] }

export type ListArgs<K = any> = {
	gt?: K
	gte?: K
	lt?: K
	lte?: K
	limit?: number
	offset?: number
	reverse?: boolean
}

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
	list: (args: ListArgs<K>) => CacheListResult<K, V>
	write: (args: WriteArgs<K, V>) => void

	subscribe: (range: Range<K>, fn: () => void) => () => void
	insert: (args: ListArgs<K>, result: { key: K; value: V }[]) => void
}

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

export type ReactiveOKV<K = any, V = any> = BaseOKV<K, V> & {
	subscribe: (range: Range<K>, fn: () => void) => () => void
}

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

export type OKV<K = any, V = any> = BaseOKV<K, V> & {
	// Sugar
	get: (key: K) => V | undefined
	prefix: (prefix: K) => { key: K; value: V }[]
	subspace(prefix: K): OKV<K, V>
	set: (key: K, value: V) => void
	delete: (key: K) => void
}

// // TODO: count, aggregations
// export type IntervalTreeApi<
// 	B = (string | number)[],
// 	K = (string | number)[],
// 	V = any,
// > = KeyValueApi<[B, B, K], V> & {
// 	overlaps: (args?: ListArgs<B>) => { key: [B, B, K]; value: V }[]
// }

// function itree<B, K, V>(okv: OrderedKeyValueApi<any, any>) {
// 	return {
// 		set: (b1: B, b2: B, k: K, v: V) => okv.set([b1, b2, k], v),
// 		overlaps: (b1: B, b2: B) => okv.list({ gt: [b1, b1, undefined], lt: [b2, b2, undefined] }),
// 	}
// }
