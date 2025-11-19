import { InMemoryOkv } from "./InMemoryOkv"
import { Range } from "./Range"
import { tupleDb } from "./TupleDb"
import { ListArgs, Okv, TupleDb, TupleOkv, WriteArgs } from "./types"

export class QueryCache<K, V> implements Okv<K, V> {
	data: InMemoryOkv<K, V>
	reads: Range<K>[] = []

	constructor(public db: Okv<K, V>) {
		this.data = new InMemoryOkv<K, V>(this.db.compare)
	}

	compare = (a: K, b: K) => this.db.compare(a, b)

	list = (args: ListArgs<K> = {}): { key: K; value: V }[] => {
		this.reads.push(args)
		const data = this.db.list(args)
		this.data.write({ set: data })
		return data
	}

	write = (args: WriteArgs<K, V>) => {
		throw new Error("Not implemented")
	}
}

export type Query = (db: TupleDb) => any

export function query(db: TupleOkv, query: string) {
	const cache = new QueryCache(db)

	const context = {
		console: { log: (msg: string) => console.log("[Sandbox]", msg) },
	}

	let result: any
	try {
		const fn: Query = new Function(
			...Object.keys(context),
			`return (function() { return ${query.trim()} })();`
		)(...Object.values(context))

		result = fn(tupleDb(cache))
	} catch (err) {
		console.error("Sandbox error:", err)
		throw new Error("Sandbox error")
	}

	const data = cache.data.data
	const ranges = cache.reads

	return { data, ranges, result }
}
