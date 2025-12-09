import { describe, it } from "mocha"
import assert from "node:assert"
import { InMemoryOkv } from "./InMemoryOkv"
import { queryFunction } from "./QueryFunction"
import { queryNodeVm } from "./QueryNodeVm"
import { tupleDb, tupleOkv } from "./TupleDb"
import { TupleDb } from "./types"

const modes = {
	query: queryFunction,
	queryNodeVm,
}

describe("queryFunction", () => {
	for (const key in modes) {
		const query = modes[key]
		it("works " + key, () => {
			const base = new InMemoryOkv<string, string>()
			const db = tupleDb(tupleOkv(base))

			db.set(["a"], 1)
			db.set(["b"], 2)
			db.set(["c"], 3)

			db.set(["list"], ["a", "b"])

			const { reads, result } = query(
				db,
				((db: TupleDb) => {
					const list = db.get(["list"])
					const items = list.map((item) => db.get([item]))
					return items.reduce((a, b) => a + b, 0)
				}).toString()
			)

			assert.equal(result, 3)

			assert.deepEqual(reads, [
				{
					args: {
						gte: ["list"],
						lte: ["list"],
					},
					results: [
						{
							key: ["list"],
							value: ["a", "b"],
						},
					],
				},
				{
					args: {
						gte: ["a"],
						lte: ["a"],
					},
					results: [
						{
							key: ["a"],
							value: 1,
						},
					],
				},
				{
					args: {
						gte: ["b"],
						lte: ["b"],
					},
					results: [
						{
							key: ["b"],
							value: 2,
						},
					],
				},
			])
		})
	}
})
