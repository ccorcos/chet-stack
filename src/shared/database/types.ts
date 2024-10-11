export type KeyValueApi<K = any, V = any> = {
	get: (key: K) => V | undefined
	set: (key: K, value: V) => void
	delete: (key: K) => void
	write: (tx: { set?: { key: K; value: V }[]; delete?: K[] }) => void
}

export type OrderedKeyValueApi<K = any, V = any> = KeyValueApi<K, V> & {
	list(args?: {
		gt?: K
		gte?: K
		lt?: K
		lte?: K
		limit?: number
		offset?: number
		reverse?: boolean
	}): { key: K; value: V }[]
}

export type IntervalTreeApi<
	B = (string | number)[],
	K = (string | number)[],
	V = any,
> = KeyValueApi<[B, B, K], V> & {
	overlaps: (args?: {
		gt?: B
		gte?: B
		lt?: B
		lte?: B
		limit?: number
		offset?: number
		reverse?: boolean
	}) => { key: [B, B, K]; value: V }[]
}
