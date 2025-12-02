/*

These functions wrap BaseOKV to encode and decode keys and values.

*/

import { compactObj } from "shared/compactObj"
import { Range } from "./Range"
import { CacheListResult, ListArgs, Okv, Tuple, WriteArgs } from "./types"

export type KeyEncoder<I, O> = {
	compare: (a: I, b: I) => number
	encode: (key: I) => O
	decode: (key: O) => I
}

export type Encoder<I, O> = {
	encode: (key: I) => O
	decode: (key: O) => I
}

export function KeyEncodeListArgs<K, O>(args: ListArgs<K>, encoder: Encoder<K, O>): ListArgs<O> {
	return compactObj({
		...args,
		gt: args?.gt === undefined ? undefined : encoder.encode(args.gt),
		gte: args?.gte === undefined ? undefined : encoder.encode(args.gte),
		lt: args?.lt === undefined ? undefined : encoder.encode(args.lt),
		lte: args?.lte === undefined ? undefined : encoder.encode(args.lte),
	})
}

/** Uncommon to use this */
export function KeyDecodeListArgs<K, O>(args: ListArgs<O>, encoder: Encoder<K, O>): ListArgs<K> {
	return compactObj({
		...args,
		gt: args?.gt === undefined ? undefined : encoder.decode(args.gt),
		gte: args?.gte === undefined ? undefined : encoder.decode(args.gte),
		lt: args?.lt === undefined ? undefined : encoder.decode(args.lt),
		lte: args?.lte === undefined ? undefined : encoder.decode(args.lte),
	})
}

export function KeyEncodeRange<K, O>(args: Range<K>, encoder: Encoder<K, O>): Range<O> {
	return compactObj({
		gt: args?.gt === undefined ? undefined : encoder.encode(args.gt),
		gte: args?.gte === undefined ? undefined : encoder.encode(args.gte),
		lt: args?.lt === undefined ? undefined : encoder.encode(args.lt),
		lte: args?.lte === undefined ? undefined : encoder.encode(args.lte),
	})
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

export function KeyEncodeOKV<I, O, V>(db: Okv<O, V>, encoder: KeyEncoder<I, O>): Okv<I, V> {
	return {
		compare: encoder.compare,
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

export function ValueEncodeOKV<K, I, O>(db: Okv<K, O>, encoder: Encoder<I, O>): Okv<K, I> {
	return {
		compare: db.compare,
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

export function KeyDecodeCacheListResult<I, O, V>(
	result: CacheListResult<O, V>,
	encoder: Encoder<I, O>
): CacheListResult<I, V> {
	if (result.hit) return { hit: KeyDecodeList(result.hit, encoder) }
	if (result.prefix) return { prefix: KeyDecodeList(result.prefix, encoder) }
	return { miss: true }
}

// Subspace
export function TupleSubspaceEncoder(prefix: Tuple): Encoder<Tuple, Tuple> {
	return {
		encode: (key) => [...prefix, ...key],
		decode: (key) => key.slice(prefix.length),
	}
}

function constraintToSubspace(args: ListArgs<Tuple>, prefix: Tuple) {
	const newArgs = { ...args }
	if (newArgs.gt === undefined && newArgs.gte === undefined) newArgs.gt = prefix
	if (newArgs.lt === undefined && newArgs.lte === undefined)
		newArgs.lte = [...prefix, ...Array(10).fill(null)]
	return newArgs
}

export function EncodeSubspaceListArgs(args: ListArgs<Tuple>, prefix: Tuple) {
	const encoder = TupleSubspaceEncoder(prefix)
	return constraintToSubspace(KeyEncodeListArgs(args, encoder), prefix)
}
