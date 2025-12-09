import vm from "node:vm"
import { Query } from "./QueryFunction"
import { ReadCache } from "./ReadCache"
import { tupleDb } from "./TupleDb"
import { TupleOkv } from "./types"

export function queryNodeVm(db: TupleOkv, query: string) {
	const cache = new ReadCache(db)

	const context = vm.createContext({
		require: undefined,
		process: undefined,
		global: undefined,
		console: { log: (msg: string) => console.log("[Sandbox]", msg) },
	})
	const code = `(function() { return ${query.trim()} })();`

	let result: any
	try {
		const fn: Query = vm.runInContext(code, context, { timeout: 1000 })
		result = fn(tupleDb(cache))
	} catch (err) {
		console.error("Sandbox error:", err)
		throw new Error("Sandbox error")
	}

	return { result, reads: cache.reads }
}
