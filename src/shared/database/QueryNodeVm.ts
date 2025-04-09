import vm from "vm"
import { ValidationError } from "../errors"
import { Cache } from "./Cache"
import { BaseOKV, ListArgs } from "./types"

export function queryNodeVm(environment: { db: BaseOKV<any[], any> }, query: string) {
	const { db } = environment

	const cache = new Cache<any[], any>()

	const list = (args: ListArgs<any[]>) => {
		const result = db.list(args)
		cache.insert(args, result)
		return result
	}

	const get = (key: any[]) => {
		const value = list({ gte: key, lte: key })
		return value[0]?.value
	}

	const sandbox = {
		require: undefined,
		process: undefined,
		global: undefined,
		console: { log: (msg: string) => console.log("[Sandbox]", msg) },
		db: { list, get },
	}

	// Create a VM context
	const context = vm.createContext(sandbox)

	let result: any
	try {
		// Execute the script and capture the return value
		result = vm.runInContext(["(function() {", query, "})();"].join("\n"), context, {
			timeout: 1000,
		})
	} catch (err) {
		console.error("Sandbox error:", err)
		throw new ValidationError("Sandbox error")
	}

	const data = cache.data.data
	const ranges = cache.cachedRanges

	return { data, ranges, result }
}
