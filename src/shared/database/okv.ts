import { codec, MAX, MIN } from "./Codec"
import { KeyEncode, ValueEncode } from "./Encoder"
import { BaseOKV, OKV } from "./types"

function stringSubspace<V>(base: BaseOKV<string, V>, prefix: string): BaseOKV<string, V> {
	return KeyEncode(base, {
		compare: base.compare,
		encode: (key) => prefix + key,
		decode: (key) => key.slice(prefix.length),
	})
}

function stringSugar<V>(base: BaseOKV<string, V>): OKV<string, V> {
	return {
		compare: base.compare,
		list: (args) => base.list(args),
		write: (tx) => base.write(tx),
		get: (key) => base.list({ gte: key, lte: key }).at(0)?.value,
		prefix: (prefix) => base.list({ gte: prefix + "\x00", lte: prefix + "\xff" }),
		subspace: (prefix) => stringSugar(stringSubspace(base, prefix)),
		set: (key, value) => base.write({ set: [{ key, value }] }),
		delete: (key) => base.write({ delete: [key] }),
	}
}

export const okv = stringSugar

function tuplejson(okv: BaseOKV<string, string>): BaseOKV<any[], any> {
	return ValueEncode(KeyEncode(okv, codec), {
		encode: (value) => JSON.stringify(value),
		decode: (value) => JSON.parse(value),
	})
}

function tupleSubspace(okv: BaseOKV<any[], any>, prefix: any[]): BaseOKV<any[], any> {
	return KeyEncode(okv, {
		compare: okv.compare,
		encode: (key) => [...prefix, ...key],
		decode: (key) => key.slice(prefix.length),
	})
}

export function tupleSugar(okv: BaseOKV<any[], any>): TupleDb {
	return {
		compare: okv.compare,
		list: (args) => okv.list(args),
		write: (tx) => okv.write(tx),
		get: (key) => okv.list({ gte: key, lt: key }).at(0)?.value,
		prefix: (prefix) => okv.list({ gte: [...prefix, MIN], lte: [...prefix, MAX] }),
		subspace: (prefix) => tupleSugar(tupleSubspace(okv, prefix)),
		set: (key, value) => okv.write({ set: [{ key, value }] }),
		delete: (key) => okv.write({ delete: [key] }),
	}
}

type TupleDb = OKV<any[], any>

export const tupleOkv = (base: BaseOKV<string, string>): TupleDb => tupleSugar(tuplejson(base))

// function reactive<K, V>(base: BaseOKV<K, V>, emitter: RangeEmitter<K>): any {
// 	return {
// 		subscribe: emitter.subscribe,
// 		list: base.list,
// 		write: (args: WriteArgs<K, V>) => {
// 			base.write(args)
// 			const keys: K[] = []
// 			for (const { key } of args.set ?? []) keys.push(key)
// 			for (const key of args.delete ?? []) keys.push(key)
// 			const ranges = Array.from(keys).map((key) => ({ gte: key, lte: key }))
// 			emitter.emit(ranges)
// 		},
// 	}
// }
