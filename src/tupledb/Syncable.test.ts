import { describe, it } from "mocha"
import { strict as assert } from "node:assert"
import { syncable } from "./Syncable"
import { tupleDb } from "./TupleDb"

describe("Syncable", () => {
	it("basic write tracking", () => {
		const db = tupleDb()
		const user = syncable(db)

		assert.equal(user.clock(), 0)

		user.set(["name"], "chet")

		// Check clock incremented
		assert.equal(user.clock(), 1)

		// Check data written
		assert.equal(user.get(["name"]), "chet")

		// Check history
		const history = user.history()
		assert.equal(history.length, 1)
		assert.equal(history[0].key[0], 0) // clock 0
		assert.deepEqual(history[0].value, { set: [{ key: ["name"], value: "chet" }] })
	})

	it("batch writes", () => {
		const db = tupleDb()
		const user = syncable(db)

		user.write({
			set: [
				{ key: ["a"], value: 1 },
				{ key: ["b"], value: 2 },
			],
			delete: [["c"]],
		})

		assert.equal(user.clock(), 1)
		assert.equal(user.get(["a"]), 1)
		assert.equal(user.get(["b"]), 2)

		const history = user.history()
		assert.equal(history.length, 1)
		assert.deepEqual(history[0].value.set, [
			{ key: ["a"], value: 1 },
			{ key: ["b"], value: 2 },
		])
		assert.deepEqual(history[0].value.delete, [["c"]])
	})

	it("subspaces share history", () => {
		const db = tupleDb()
		const user = syncable(db)
		const inbox = user.subspace(["inbox"])

		inbox.set(["msg1"], "hello")

		// Check root clock
		assert.equal(user.clock(), 1)
		assert.equal(inbox.clock(), 1)

		// Check root history
		const history = user.history()
		assert.equal(history.length, 1)
		// History key should be preserved (no prefix in the history value's WriteArgs? 
		// Wait, my implementation prefixes them!)
		// Let's check the implementation again.
		// syncableSubspace prefixes the keys before calling root.writeSyncable.
		// So the history should contain the full key.
		
		assert.deepEqual(history[0].value.set[0].key, ["inbox", "msg1"])

		// Check data retrieval
		assert.equal(inbox.get(["msg1"]), "hello")
		assert.equal(user.get(["inbox", "msg1"]), "hello")
	})

	it("underlying db structure", () => {
		const db = tupleDb()
		const user = syncable(db)
		
		user.set(["a"], 1)

		// Check actual DB keys
		assert.equal(db.get(["clock"]), 1)
		// history is at ["history", 0]
		assert.ok(db.get(["history", 0]))
		// data is at ["data", "a"]
		assert.equal(db.get(["data", "a"]), 1)
	})
})
