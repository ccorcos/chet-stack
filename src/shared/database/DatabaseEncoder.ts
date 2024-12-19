import { ListArgs, OrderedKeyValueApi, WriteArgs } from "./types"

type KeyValueEncoder<K, V> = {
	encodeKey: (key: K) => string
	decodeKey: (key: string) => K
	encodeValue: (value: V) => string
	decodeValue: (value: string) => V
}

export type Encoder<I, O> = {
	encode: (key: I) => O
	decode: (key: O) => I
}

// This is the equivalent fo the "tuple-layer" from foundationdb.

export function Subspace(prefix: string, db: OrderedKeyValueApi<string, any>) {
	return KeyEncoder(db, {
		encode: (key) => prefix + key,
		decode: (key) => key.slice(prefix.length),
	})
}

export function SubspaceEncoder(prefix: string): Encoder<string, string> {
	return {
		encode: (key) => prefix + key,
		decode: (key) => key.slice(prefix.length),
	}
}

export function KeyEncodeListArgs<K, O>(args: ListArgs<K>, encoder: Encoder<K, O>): ListArgs<O> {
	return {
		...args,
		gt: args?.gt === undefined ? undefined : encoder.encode(args.gt),
		gte: args?.gte === undefined ? undefined : encoder.encode(args.gte),
		lt: args?.lt === undefined ? undefined : encoder.encode(args.lt),
		lte: args?.lte === undefined ? undefined : encoder.encode(args.lte),
	}
}

export function KeyDecodeListResults<K, V, O>(
	results: { key: O; value: V }[],
	encoder: Encoder<K, O>
): { key: K; value: V }[] {
	return results.map(({ key, value }) => ({ key: encoder.decode(key), value }))
}

export function KeyEncodeWrite<K, V, O>(
	args: WriteArgs<K, V>,
	encoder: Encoder<K, O>
): WriteArgs<O, V> {
	return {
		set: args.set?.map(({ key, value }) => ({ key: encoder.encode(key), value })),
		delete: args.delete?.map((key) => encoder.encode(key)),
	}
}

export function KeyEncoder<K, V>(
	db: OrderedKeyValueApi<string, V>,
	encoder: Encoder<K, string>
): OrderedKeyValueApi<K, V> {
	return {
		get(key: K) {
			return db.get(encoder.encode(key))
		},

		list(args) {
			const newArgs = KeyEncodeListArgs(args || {}, encoder)
			const results = db.list(newArgs)
			return KeyDecodeListResults(results, encoder)
		},

		set(key: K, value: V) {
			return db.set(encoder.encode(key), value)
		},

		delete(key: K) {
			return db.delete(encoder.encode(key))
		},

		write(args) {
			const newArgs = KeyEncodeWrite(args, encoder)
			return db.write(newArgs)
		},
	}
}

export function ValueEncoder<K, V>(
	db: OrderedKeyValueApi<K, string>,
	encoder: Encoder<V, string>
): OrderedKeyValueApi<K, V> {
	return {
		get(key: K) {
			const value = db.get(key)
			if (value === undefined) return
			return encoder.decode(value)
		},

		list(args) {
			return db.list(args).map(({ key, value }) => ({ key, value: encoder.decode(value) }))
		},

		set(key: K, value: V) {
			return db.set(key, encoder.encode(value))
		},

		delete: db.delete,

		write(tx: { set?: { key: K; value: V }[]; delete?: K[] }) {
			return db.write({
				set: tx.set?.map(({ key, value }) => ({ key, value: encoder.encode(value) })),
				delete: tx.delete,
			})
		},
	}
}
