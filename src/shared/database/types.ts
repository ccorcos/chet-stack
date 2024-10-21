export type Transaction<K = any, V = any> = { set?: { key: K; value: V }[]; delete?: K[] }

export type KeyValueApi<K = any, V = any> = {
	get: (key: K) => V | undefined
	set: (key: K, value: V) => void
	delete: (key: K) => void
	write: (tx: Transaction<K, V>) => void
}

export type ListArgs<K = any> = {
	gt?: K
	gte?: K
	lt?: K
	lte?: K
	limit?: number
	offset?: number
	reverse?: boolean
}

export type OrderedKeyValueApi<K = any, V = any> = KeyValueApi<K, V> & {
	list(args?: ListArgs<K>): { key: K; value: V }[]
}

// TODO: count, aggregations
export type IntervalTreeApi<
	B = (string | number)[],
	K = (string | number)[],
	V = any,
> = KeyValueApi<[B, B, K], V> & {
	overlaps: (args?: ListArgs<B>) => { key: [B, B, K]; value: V }[]
}
