// reactivity
// set/get
// prefix/subspace
// query
// LATER: transaction
// index
// LATER: schema

import { codec, MAX, MIN } from "./Codec"
import { KeyEncode } from "./Encoder"
import { InMemoryBaseOKV } from "./InMemoryBaseOKV"
import { Range } from "./Range"
import { RangeEmitter } from "./RangeEmitter"
import { ListArgs, WriteArgs } from "./types"

type K = any[]
type V = any

type BaseOKV = {
	compare: (a: K, b: K) => number
	list(args?: ListArgs<K>): { key: K; value: V }[]
	write: (tx: WriteArgs<K, V>) => void
}

function reactiveOkv<D extends BaseOKV>(
	base: D,
	emitter: RangeEmitter<K>
): D & { subscribe: (range: Range<K>, fn: () => void) => () => void } {
	return {
		...base,
		subscribe: emitter.subscribe,
		write: (args: WriteArgs<K, V>) => {
			base.write(args)
			const keys: K[] = []
			for (const { key } of args.set ?? []) keys.push(key)
			for (const key of args.delete ?? []) keys.push(key)
			const ranges = Array.from(keys).map((key) => ({ gte: key, lte: key }))
			emitter.emit(ranges)
		},
	}
}

function readSugar<D extends BaseOKV>(base: D) {
	return {
		...base,
		get: (key) => base.list({ gte: key, lt: key }).at(0)?.value,
		prefix: (prefix) => base.list({ gte: [...prefix, MIN], lte: [...prefix, MAX] }),
	}
}

function writeSugar<D extends BaseOKV>(base: D) {
	return {
		...base,
		set: (key, value) => base.write({ set: [{ key, value }] }),
		delete: (key) => base.write({ delete: [key] }),
	}
}

function subspaceSugar<D extends BaseOKV>(base: D) {
	return {
		...base,
		subspace: (prefix) =>
			sugar(
				KeyEncode(base, {
					compare: base.compare,
					encode: (key) => [...prefix, ...key],
					decode: (key) => key.slice(prefix.length),
				})
			),
	}
}

function sugar<D extends BaseOKV>(base: D) {
	return querySugar(subspaceSugar(writeSugar(readSugar(base))))
}

class QueryTransaction implements BaseOKV {
	data = new InMemoryBaseOKV<K, V>(codec.compare)
	reads: Range<K>[] = []
	// writes: WriteArgs<K, V> = { set: [], delete: [] }

	constructor(public db: BaseOKV) {}

	compare = (a: K, b: K) => this.db.compare(a, b)

	list(args: ListArgs<K> = {}): { key: K; value: V }[] {
		this.reads.push(args)
		const data = this.db.list(args)
		this.data.write({ set: data })
		return data
	}

	write(args: WriteArgs<K, V>) {
		throw new Error("Not implemented")
		// this.writes = {
		// 	set: [...this.writes.set!, ...(args.set ?? [])],
		// 	delete: [...this.writes.delete!, ...(args.delete ?? [])],
		// }
	}

	commit = () => {
		throw new Error("Not implemented")
		// this.db.write(this.writes)
	}
}

function querySugar<D extends BaseOKV>(base: D) {
	return {
		...base,
		query: (fnStr: string) => {
			const tx = new QueryTransaction(base)

			const context = {
				console: { log: (msg: string) => console.log("[Sandbox]", msg) },
			}

			let result: any
			try {
				const fn = new Function(
					...Object.keys(context),
					`return (function() { return ${fnStr.trim()} })();`
				)(...Object.values(context))

				result = fn(sugar(tx))
			} catch (err) {
				console.error("Sandbox error:", err)
				throw new Error("Sandbox error")
			}

			const data = tx.data.data
			const ranges = tx.reads

			return { data, ranges, result }
		},
	}
}

// TODO:
// - indexing sugar
// - schema sugar

type Simplify<T> = {
	[K in keyof T]: T[K]
}

function TupleDb() {
	const base = new InMemoryBaseOKV(codec.compare)
	const emitter = new RangeEmitter<K>(base.compare)
	return sugar(reactiveOkv(base, emitter))
}

type TupleDb = Simplify<ReturnType<typeof TupleDb>>

const db = TupleDb()
