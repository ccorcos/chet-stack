import { codec } from "./Codec"
import { ListArgs, OrderedKeyValueApi, WriteArgs } from "./types"

export type Encoder<I, O> = {
	encode: (key: I) => O
	decode: (key: O) => I
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

export function KeyDecodeList<K, V, O>(
	results: { key: O; value: V }[],
	encoder: Encoder<K, O>
): { key: K; value: V }[] {
	return results.map(({ key, value }) => ({ key: encoder.decode(key), value }))
}

export function KeyEncodeList<K, V, O>(
	results: { key: K; value: V }[],
	encoder: Encoder<K, O>
): { key: O; value: V }[] {
	return results.map(({ key, value }) => ({ key: encoder.encode(key), value }))
}

export function KeyEncodeWrite<K, V, O>(
	args: WriteArgs<K, V>,
	encoder: Encoder<K, O>
): WriteArgs<O, V> {
	return {
		set: args.set ? KeyEncodeList(args.set, encoder) : undefined,
		delete: args.delete?.map((key) => encoder.encode(key)),
	}
}

export function KeyEncode<I, O, V>(
	db: OrderedKeyValueApi<O, V>,
	encoder: Encoder<I, O>
): OrderedKeyValueApi<I, V> {
	return {
		get(key: I) {
			return db.get(encoder.encode(key))
		},

		list(args) {
			const newArgs = KeyEncodeListArgs(args || {}, encoder)
			const results = db.list(newArgs)
			return KeyDecodeList(results, encoder)
		},

		set(key: I, value: V) {
			return db.set(encoder.encode(key), value)
		},

		delete(key: I) {
			return db.delete(encoder.encode(key))
		},

		write(args) {
			const newArgs = KeyEncodeWrite(args, encoder)
			return db.write(newArgs)
		},
	}
}

export function ValueEncode<K, I, O>(
	db: OrderedKeyValueApi<K, O>,
	encoder: Encoder<I, O>
): OrderedKeyValueApi<K, I> {
	return {
		get(key: K) {
			const value = db.get(key)
			if (value === undefined) return
			return encoder.decode(value)
		},

		list(args) {
			return db.list(args).map(({ key, value }) => ({ key, value: encoder.decode(value) }))
		},

		set(key: K, value: I) {
			return db.set(key, encoder.encode(value))
		},

		delete: db.delete,

		write(tx: { set?: { key: K; value: I }[]; delete?: K[] }) {
			return db.write({
				set: tx.set?.map(({ key, value }) => ({ key, value: encoder.encode(value) })),
				delete: tx.delete,
			})
		},
	}
}

export function PrefixKeyEncoder(prefix: string): Encoder<string, string> {
	return {
		encode: (key) => prefix + key,
		decode: (key) => key.slice(prefix.length),
	}
}

export function PrefixTupleEncoder(prefix: string): Encoder<string[], string[]> {
	return {
		encode: (key) => [prefix, ...key],
		decode: (key) => key.slice(1),
	}
}

export const JSONValueEncoder: Encoder<string, any> = {
	encode: (value) => JSON.stringify(value),
	decode: (value) => JSON.parse(value),
}

export const TupleKeyEncoder: Encoder<string, any> = {
	encode: (key) => codec.encode(key),
	decode: (key) => codec.decode(key),
}
