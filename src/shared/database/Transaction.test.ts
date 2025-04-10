import { strict as assert } from "assert"
import { describe, it } from "mocha"
import { InMemoryBaseOKV } from "./InMemoryBaseOKV"
import { Transaction } from "./Transaction"

/** Includes end value! */
function kv(start: number, end?: number) {
	if (end === undefined) end = start
	return Array.from({ length: end - start + 1 }, (_, i) => i + start)
		.map((i) => i.toString().padStart(2, "0"))
		.map((i) => ({ key: i, value: i }))
}

function rng(start: number, end?: number) {
	if (end === undefined) end = start
	return { gte: start.toString().padStart(2, "0"), lte: end.toString().padStart(2, "0") }
}

describe("Transaction", () => {
	it("reads through to the database", () => {
		const db = new InMemoryBaseOKV()
		db.write({ set: kv(0, 10) })

		const tx = new Transaction(db)

		assert.deepEqual(tx.list(rng(0)), kv(0))
		assert.deepEqual(tx.list(), kv(0, 10))

		// Reading through to the database works.
		// Cached ranges and stuff work.
		// Cache prefix result and then fetch more should combine correctly.
		// Overwriting the cache works and returns the correct values.
		// Overwriting your own writes should work too.
	})

	it("reads it own writes", () => {
		const db = new InMemoryBaseOKV()
		db.write({ set: kv(0, 10) })

		const tx = new Transaction(db)

		tx.write({ set: [{ key: "00", value: "xx" }] })
		assert.deepEqual(tx.list(rng(0)), [{ key: "00", value: "xx" }])
		assert.deepEqual(tx.list(), [{ key: "00", value: "xx" }, ...kv(1, 10)])

		assert.deepEqual(db.list(), kv(0, 10))
		tx.commit()
		assert.deepEqual(db.list(), [{ key: "00", value: "xx" }, ...kv(1, 10)])
	})
})
