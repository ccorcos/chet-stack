import { BaseOKV, ListArgs, WriteArgs } from "./types"

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

export function KeyEncode<I, O, V>(db: BaseOKV<O, V>, encoder: Encoder<I, O>): BaseOKV<I, V> {
	return {
		list(args) {
			const newArgs = KeyEncodeListArgs(args || {}, encoder)
			const results = db.list(newArgs)
			return KeyDecodeList(results, encoder)
		},
		write(args) {
			const newArgs = KeyEncodeWrite(args, encoder)
			return db.write(newArgs)
		},
	}
}

export function ValueEncode<K, I, O>(db: BaseOKV<K, O>, encoder: Encoder<I, O>): BaseOKV<K, I> {
	return {
		list(args) {
			return db.list(args).map(({ key, value }) => ({ key, value: encoder.decode(value) }))
		},
		write(tx: { set?: { key: K; value: I }[]; delete?: K[] }) {
			return db.write({
				set: tx.set?.map(({ key, value }) => ({ key, value: encoder.encode(value) })),
				delete: tx.delete,
			})
		},
	}
}
