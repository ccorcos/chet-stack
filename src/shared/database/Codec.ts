import { Codec } from "lexicodec"
import { OrderedKeyValueApi } from "./types"

// This is the equivalent fo the "tuple-layer" from foundationdb.

export function KeyEncoder<K, V>(
	db: OrderedKeyValueApi<string, V>,
	codec: Codec
): OrderedKeyValueApi<K, V> {
	return {
		get(key: K) {
			return db.get(codec.encode(key))
		},

		list(args) {
			return db
				.list({
					...args,
					gt: args?.gt === undefined ? undefined : codec.encode(args.gt),
					gte: args?.gte === undefined ? undefined : codec.encode(args.gte),
					lt: args?.lt === undefined ? undefined : codec.encode(args.lt),
					lte: args?.lte === undefined ? undefined : codec.encode(args.lte),
				})
				.map(({ key, value }) => ({ key: codec.decode(key), value }))
		},

		set(key: K, value: V) {
			return db.set(codec.encode(key), value)
		},

		delete(key: K) {
			return db.delete(codec.encode(key))
		},

		write(tx: { set?: { key: K; value: V }[]; delete?: K[] }) {
			return db.write({
				set: tx.set?.map(({ key, value }) => ({ key: codec.encode(key), value })),
				delete: tx.delete?.map((key) => codec.encode(key)),
			})
		},
	}
}

export function ValueEncoder<K, V>(
	db: OrderedKeyValueApi<K, string>,
	codec: Codec
): OrderedKeyValueApi<K, V> {
	return {
		get(key: K) {
			const value = db.get(key)
			if (value === undefined) return
			return codec.decode(value)
		},

		list(args) {
			return db.list(args).map(({ key, value }) => ({ key, value: codec.decode(value) }))
		},

		set(key: K, value: V) {
			return db.set(key, codec.encode(value))
		},

		delete: db.delete,

		write(tx: { set?: { key: K; value: V }[]; delete?: K[] }) {
			return db.write({
				set: tx.set?.map(({ key, value }) => ({ key, value: codec.encode(value) })),
				delete: tx.delete,
			})
		},
	}
}
