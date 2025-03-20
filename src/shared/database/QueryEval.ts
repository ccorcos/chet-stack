import { ValidationError } from "../errors"
import { Cache } from "./Cache"
import { ListArgs, OrderedKeyValueApi } from "./types"

export function query(
	environment: { db: OrderedKeyValueApi<string, string> },
	args: { query: string }
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

	const context = {
		console: { log: (msg: string) => console.log("[Sandbox]", msg) },
		db: { list, get, getJSON, listJSON },
	}

	const { query } = args

	let result: any
	try {
		const fn = new Function(...Object.keys(context), `return (function() { ${query} })();`)
		result = fn(...Object.values(context))
	} catch (err) {
		console.error("Sandbox error:", err)
		throw new ValidationError("Sandbox error")
	}

	const data = cache.data.data
	const ranges = cache.cachedRanges

	return { data, ranges, result }
}
