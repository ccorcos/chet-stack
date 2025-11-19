import { describe, it } from "mocha"
import { strict as assert } from "node:assert"
import { InMemoryOkv } from "./InMemoryOkv"
import { Transaction } from "./Transaction"

/** Includes end value! */
function kv(start: number, end?: number) {
	if (end === undefined) end = start
	return Array.from({ length: end - start + 1 }, (_, i) => i + start)
		.map((i) => i.toString().padStart(2, "0"))
		.map((i) => ({ key: i, value: i }))
}

describe("Transaction", () => {
	it("reads through to the database", () => {
		const db = new InMemoryOkv()
		db.write({ set: kv(0, 10) })
		const tx = new Transaction(db)
		assert.deepEqual(tx.list(), kv(0, 10))
	})

	it("reads it own writes", () => {
		const db = new InMemoryOkv()
		db.write({ set: kv(0, 10) })

		const tx = new Transaction(db)

		tx.write({ set: [{ key: "00", value: "xx" }], delete: ["10"] })
		assert.deepEqual(tx.list(), [{ key: "00", value: "xx" }, ...kv(1, 9)])

		// Db hasnt changed uet.
		assert.deepEqual(db.list(), kv(0, 10))
		tx.commit()
		// Now it has.
		assert.deepEqual(db.list(), [{ key: "00", value: "xx" }, ...kv(1, 9)])
	})

	it("prefix results combine correctly", () => {
		const db = new InMemoryOkv()
		db.write({ set: kv(0, 10) })

		const tx = new Transaction(db)
		tx.list({ gte: "00", lte: "05" })
		tx.write({ set: [{ key: "00", value: "xx" }], delete: ["10"] })
		assert.deepEqual(tx.list(), [{ key: "00", value: "xx" }, ...kv(1, 9)])
	})

	it("overwriting pending sets and deletes", () => {
		const db = new InMemoryOkv()
		db.write({ set: kv(0, 10) })

		const tx = new Transaction(db)
		tx.write({ set: [{ key: "00", value: "xx" }], delete: ["10"] })
		assert.deepEqual(tx.list(), [{ key: "00", value: "xx" }, ...kv(1, 9)])
		tx.write({ set: [{ key: "10", value: "xx" }], delete: ["00"] })
		assert.deepEqual(tx.list(), [...kv(1, 9), { key: "10", value: "xx" }])

		tx.commit()
		assert.deepEqual(db.list(), [...kv(1, 9), { key: "10", value: "xx" }])
	})
})
