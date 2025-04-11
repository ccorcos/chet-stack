import assert from "assert"
import { describe, it } from "mocha"
import { InMemoryBaseOKV } from "./InMemoryBaseOKV"
import { tupleDb, tupleOkv } from "./OKV"
import { query } from "./Query"
import { queryNodeVm } from "./QueryNodeVm"
import { TupleDb } from "./types"

const modes = {
	query,
	queryNodeVm,
}

describe("query", () => {
	for (const key in modes) {
		const query = modes[key]
		it("works " + key, () => {
			const base = new InMemoryBaseOKV<string, string>()
			const db = tupleDb(tupleOkv(base))

			db.set(["a"], 1)
			db.set(["b"], 2)
			db.set(["c"], 3)

			db.set(["list"], ["a", "b"])

			const { data, ranges, result } = query(
				db,
				((db: TupleDb) => {
					const list = db.get(["list"])
					const items = list.map((item) => db.get([item]))
					return items.reduce((a, b) => a + b, 0)
				}).toString()
			)

			assert.equal(result, 3)

			assert.deepEqual(data, [
				{ key: ["a"], value: 1 },
				{ key: ["b"], value: 2 },
				{ key: ["list"], value: ["a", "b"] },
			])

			assert.deepEqual(ranges, [
				{ gte: ["list"], lte: ["list"] },
				{ gte: ["a"], lte: ["a"] },
				{ gte: ["b"], lte: ["b"] },
			])
		})
	}
})
