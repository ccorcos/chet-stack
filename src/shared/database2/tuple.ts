import { codec, MAX, MIN } from "./codec"
import { KeyEncode, ValueEncode } from "./encoder"
import { BaseOKV, OKV } from "./types"

function tuplejson(okv: BaseOKV<string, string>): BaseOKV<any[], any> {
	return ValueEncode(
		KeyEncode(okv, {
			encode: (key) => codec.encode(key),
			decode: (key) => codec.decode(key),
		}),
		{
			encode: (value) => JSON.stringify(value),
			decode: (value) => JSON.parse(value),
		}
	)
}

function subspace(okv: BaseOKV<any[], any>, prefix: any[]): BaseOKV<any[], any> {
	return KeyEncode(okv, {
		encode: (key) => [...prefix, ...key],
		decode: (key) => key.slice(prefix.length),
	})
}

function sugar(okv: BaseOKV<any[], any>): TupleDb {
	return {
		list: (args) => okv.list(args),
		write: (tx) => okv.write(tx),
		get: (key) => okv.list({ gte: key, lt: key }).at(0)?.value,
		prefix: (prefix) => okv.list({ gte: [...prefix, MIN], lte: [...prefix, MAX] }),
		subspace: (prefix) => sugar(subspace(okv, prefix)),
		set: (key, value) => okv.write({ set: [{ key, value }] }),
		delete: (key) => okv.write({ delete: [key] }),
	}
}

type TupleDb = OKV<any[], any>

export const tupledb = (base: BaseOKV<string, string>): TupleDb => sugar(tuplejson(base))
