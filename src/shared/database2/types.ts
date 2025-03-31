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
	// Primitives
	list(args?: ListArgs<K>): { key: K; value: V }[]
	write: (tx: WriteArgs<K, V>) => void
	compare: (a: K, b: K) => number
}

export type OKV<K = any, V = any> = BaseOKV<K, V> & {
	// Sugar
	get: (key: K) => V | undefined
	prefix: (prefix: K) => { key: K; value: V }[]
	subspace(prefix: K): OKV<K, V>
	set: (key: K, value: V) => void
	delete: (key: K) => void
}

export type Index<K = any, V = any> = {
	id: string
	// secondary indexes are 0, tertiary indexes are 1.
	order: number
	range: ListArgs<K>
	set: (db: OKV<K, V>, key: K, value: V) => void
	delete: (db: OKV<K, V>, key: K) => void
}

export type IndexableOKV<K = any, V = any> = OKV<K, V> & {
	createIndex(index: Index<K, V>): void
	deleteIndex(id: string): void
}
