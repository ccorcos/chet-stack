import vm from "vm"
import { ValidationError } from "../errors"
import { Cache } from "./Cache"
import { ListArgs, OrderedKeyValueApi } from "./types"

export function queryNodeVm(
	environment: { db: OrderedKeyValueApi<string, string> },
	query: string
) {
	const { db } = environment

	const cache = new Cache()

	const list = (args: ListArgs<string>) => {
		const result = db.list(args)
		cache.insert(args, result)
		return result
	}

	const listJSON = (args: ListArgs<string>) => {
		const result = list(args)
		return result.map(({ key, value }) => ({ key, value: JSON.parse(value) }))
	}

	const get = (key: string) => {
		const value = list({ gte: key, lte: key })
		return value[0]?.value
	}

	const getJSON = (key: string) => {
		const value = get(key)
		return JSON.parse(value)
	}

	const sandbox = {
		require: undefined,
		process: undefined,
		global: undefined,
		console: { log: (msg: string) => console.log("[Sandbox]", msg) },
		db: { list, get, getJSON, listJSON },
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
