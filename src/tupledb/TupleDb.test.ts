import { describe, it } from "mocha"
import { strict as assert } from "node:assert"
import { tupleDb, tupleTx } from "./TupleDb"
import { TupleDb } from "./types"

describe("TupleDb", () => {
	it("tupledb subspace", () => {
		const db = tupleDb()

		db.set(["foo"], "bar")
		assert.equal(db.get(["foo"]), "bar")

		db.set(["person", 0], "chet")
		db.set(["person", 1], "simon")

		assert.equal(db.get(["person", 0]), "chet")
		assert.equal(db.subspace(["person"]).get([0]), "chet")
		assert.deepEqual(db.subspace(["person"]).list(), [
			{ key: [0], value: "chet" },
			{ key: [1], value: "simon" },
		])

		db.subspace(["person"]).set([0], "chet2")
		assert.equal(db.get(["person", 0]), "chet2")
	})

	it("tupledb transact basics", () => {
		const db = tupleDb()

		const tx = tupleTx(db)
		tx.set(["foo"], "bar")
		assert.equal(tx.get(["foo"]), "bar")
		assert.equal(db.get(["foo"]), undefined)
		tx.commit()
		assert.equal(db.get(["foo"]), "bar")

		assert.equal(tx.committed, true)
		assert.throws(() => tx.list())
		assert.throws(() => tx.write({}))
		assert.throws(() => tx.commit())
	})

	it("tupledb transact then subspace", () => {
		const db = tupleDb()

		const tx = tupleTx(db)
		const person = tx.subspace(["person"])
		person.set([0], "chet")
		person.set([1], "simon")

		assert.equal(person.get([0]), "chet")
		assert.equal(person.get([1]), "simon")

		assert.deepEqual(db.subspace(["person"]).list(), [])
		tx.commit()

		assert.deepEqual(db.list(), [
			{ key: ["person", 0], value: "chet" },
			{ key: ["person", 1], value: "simon" },
		])
	})

	it("tupledb subspace then transact", () => {
		const db = tupleDb()
		const person = db.subspace(["person"])

		const tx = tupleTx(person)
		tx.set([0], "chet")
		tx.set([1], "simon")

		assert.equal(tx.get([0]), "chet")
		assert.equal(tx.get([1]), "simon")

		assert.deepEqual(db.list(), [])
		assert.deepEqual(person.list(), [])

		tx.commit()

		assert.deepEqual(db.list(), [
			{ key: ["person", 0], value: "chet" },
			{ key: ["person", 1], value: "simon" },
		])

		assert.deepEqual(person.list(), [
			{ key: [0], value: "chet" },
			{ key: [1], value: "simon" },
		])
	})

	it("transact composition", () => {
		const db = tupleDb()

		const createPerson = (tx: TupleDb, person: { name: string; age: number }) => {
			const people = tx.subspace(["people"])
			people.set(["name", person.name], null)
			people.set(["age", person.age], null)
		}

		const createPersonTwoPlaces = (tx: TupleDb, person: { name: string; age: number }) => {
			createPerson(tx.subspace(["A"]), person)
			createPerson(tx.subspace(["B"]), person)
		}

		createPersonTwoPlaces(db, { name: "chet", age: 30 })

		assert.deepEqual(db.list(), [
			{ key: ["A", "people", "age", 30], value: null },
			{ key: ["A", "people", "name", "chet"], value: null },
			{ key: ["B", "people", "age", 30], value: null },
			{ key: ["B", "people", "name", "chet"], value: null },
		])

		createPerson(db.subspace(["B"]), { name: "simon", age: 28 })

		assert.deepEqual(db.list(), [
			{ key: ["A", "people", "age", 30], value: null },
			{ key: ["A", "people", "name", "chet"], value: null },
			{ key: ["B", "people", "age", 28], value: null },
			{ key: ["B", "people", "age", 30], value: null },
			{ key: ["B", "people", "name", "chet"], value: null },
			{ key: ["B", "people", "name", "simon"], value: null },
		])
	})

	it("Transaction overfetch for deletes", () => {
		const db = tupleDb()
		for (let i = 0; i < 20; i++) db.set([i], i)

		const tx = tupleTx(db)
		tx.delete([0])
		tx.delete([20])
		// These aren't necessary, but it's important to make sure that we aren't
		// assuming that these writes are at the beginning of the range before
		// the limit.
		tx.set([21], 21)

		// The tx should fetch limit 3 instead of limit 1, overwrite the pending deletes,
		// and end up with the [1].
		assert.deepEqual(tx.list({ limit: 1 }), [{ key: [1], value: 1 }])
	})
})
