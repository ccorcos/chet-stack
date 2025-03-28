import { KeyEncode } from "./encoder"
import { BaseOKV, OKV } from "./types"

function subspace(base: BaseOKV<string, string>, prefix: string): BaseOKV<string, string> {
	return KeyEncode(base, {
		encode: (key) => prefix + key,
		decode: (key) => key.slice(prefix.length),
	})
}

function sugar(base: BaseOKV<string, string>): OKV<string, string> {
	return {
		list: (args) => base.list(args),
		write: (tx) => base.write(tx),
		get: (key) => base.list({ gte: key, lt: key }).at(0)?.value,
		prefix: (prefix) => base.list({ gte: prefix + "\x00", lte: prefix + "\xff" }),
		subspace: (prefix) => sugar(subspace(base, prefix)),
		set: (key, value) => base.write({ set: [{ key, value }] }),
		delete: (key) => base.write({ delete: [key] }),
	}
}

export const okv = sugar
