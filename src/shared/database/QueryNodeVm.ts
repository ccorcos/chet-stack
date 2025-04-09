import vm from "vm"
import { ValidationError } from "../errors"
import { sugar } from "./OKV"
import { Query, QueryCache } from "./Query"
import { TupleDb } from "./types"

export function queryNodeVm(db: TupleDb, query: string) {
	const cache = new QueryCache(db)

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
		result = fn(sugar(cache))
	} catch (err) {
		console.error("Sandbox error:", err)
		throw new ValidationError("Sandbox error")
	}

	const data = cache.data.data
	const ranges = cache.reads

	return { data, ranges, result }
}
