import { strict as assert } from "assert"
import { describe, it } from "mocha"
import { ValueEncode } from "./encoder"
import { InMemoryBaseOKV } from "./InMemoryBaseOKV"
import { okv } from "./okv"
import { query } from "./query"
import { OKV } from "./types"

describe("query", () => {
	it("works", () => {
		const base = new InMemoryBaseOKV<string, string>()
		const json = ValueEncode(base, {
			encode: (value: any) => JSON.stringify(value),
			decode: (value) => JSON.parse(value),
		})
		const db = okv(json)

		db.set("a", 1)
		db.set("b", 2)
		db.set("c", 3)

		db.set("list", ["a", "b"])

		const { data, ranges, result } = query(
			db,
			((db: OKV<string, any>) => {
				const list = db.get("list")
				const items = list.map((item) => db.get(item))
				return items.reduce((a, b) => a + b, 0)
			}).toString()
		)

		assert.equal(result, 3)

		assert.deepEqual(data, [
			{ key: "a", value: 1 },
			{ key: "b", value: 2 },
			{ key: "list", value: ["a", "b"] },
		])

		assert.deepEqual(ranges, [
			{ gte: "list", lte: "list" },
			{ gte: "a", lte: "a" },
			{ gte: "b", lte: "b" },
		])
	})
})
