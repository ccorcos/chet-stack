// Monolithic abstraction.

import { codec } from "./Codec"
import { InMemoryBaseOKV } from "./InMemoryBaseOKV"
import { RangeEmitter } from "./RangeEmitter"
import { WriteArgs } from "./types"

// base
// reactivity

// set/get
// prefix/subspace
// query
// LATER: transaction
// index
// LATER: schema

type K = any[]
type V = any

class InMemoryTupleDb {
	storage = new InMemoryBaseOKV<K, V>(codec.compare)
	compare = this.storage.compare

	list = this.storage.list
	get = (key) => this.storage.list({ gte: key, lt: key }).at(0)?.value
	prefix = (prefix) =>
		this.storage.list({ gt: [...prefix], lte: [...prefix, null, null, null, null, null, null] })

	emitter = new RangeEmitter<any[]>(codec.compare)
	subscribe = this.emitter.subscribe

	write = (args: WriteArgs<K, V>) => {
		this.storage.write(args)
		const keys: K[] = []
		for (const { key } of args.set ?? []) keys.push(key)
		for (const key of args.delete ?? []) keys.push(key)
		const ranges = Array.from(keys).map((key) => ({ gte: key, lte: key }))
		this.emitter.emit(ranges)
	}
	set = (key, value) => this.write({ set: [{ key, value }] })
	delete = (key) => this.write({ delete: [key] })

	// subspace = (prefix) => {
	// 	new InMemoryTupleDb(
	// 		KeyEncode(okv, {
	// 			compare: okv.compare,
	// 			encode: (key) => [...prefix, ...key],
	// 			decode: (key) => key.slice(prefix.length),
	// 		})
	// 	)
	// }
}

class InMemorySubspaceTupleDb {
	constructor(
		private db: InMemoryTupleDb,
		private prefix: K
	) {}
}
