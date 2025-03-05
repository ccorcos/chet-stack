import { strict as assert } from "assert"
import { describe, it } from "mocha"
import { InMemoryDatabase } from "./InMemoryDatabase"
import { query } from "./Query"

describe("Query", () => {
	it("works", () => {
		const db = new InMemoryDatabase<string, string>()

		db.set("a", "1")
		db.set("b", "2")
		db.set("c", "3")

		db.set("list", JSON.stringify(["a", "b"]))

		const { data, ranges, result } = query(
			{ db },
			{
				query: `
				const list = JSON.parse(get('list'))
				const items = list.map(item => JSON.parse(get(item)));
				return items.reduce((a, b) => a + b, 0)
			`,
			}
		)

		assert.equal(result, 3)

		assert.deepEqual(data, [
			{ key: "a", value: "1" },
			{ key: "b", value: "2" },
			{ key: "list", value: '["a","b"]' },
		])

		assert.deepEqual(ranges, [
			{ gte: "a", lte: "a" },
			{ gte: "b", lte: "b" },
			{ gte: "list", lte: "list" },
		])
	})
})
