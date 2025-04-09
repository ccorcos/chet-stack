import { ValidationError } from "../errors"
import { InMemoryBaseOKV } from "./InMemoryBaseOKV"
import { sugar } from "./OKV"
import { Range } from "./Range"
import { BaseOKV, ListArgs, SugarTupleDb, TupleDb, WriteArgs } from "./types"

export class QueryCache<K, V> implements BaseOKV<K, V> {
	data: InMemoryBaseOKV<K, V>
	reads: Range<K>[] = []

	constructor(public db: BaseOKV<K, V>) {
		this.data = new InMemoryBaseOKV<K, V>(this.db.compare)
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

export type Query = (db: SugarTupleDb) => any

export function query(db: TupleDb, query: string) {
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

		result = fn(sugar(cache))
	} catch (err) {
		console.error("Sandbox error:", err)
		throw new ValidationError("Sandbox error")
	}

	const data = cache.data.data
	const ranges = cache.reads

	return { data, ranges, result }
}
