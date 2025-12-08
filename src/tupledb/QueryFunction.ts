import { QueryCache } from "./QueryCache"
import { tupleDb } from "./TupleDb"
import { TupleDb, TupleOkv } from "./types"

export type Query = (db: TupleDb) => any

export function queryFunction(db: TupleOkv, query: string) {
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
