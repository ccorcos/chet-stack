import { strict as assert } from "assert"
import { describe, it } from "mocha"
import * as t from "../DataType"
import { codec } from "./Codec"
import { InMemoryBaseOKV } from "./InMemoryBaseOKV"
import {
	createIndex,
	createTable,
	deleteIndex,
	deleteRecord,
	deleteTable,
	setRecord,
} from "./RecordDb"
import { tupleDb } from "./TupleDb"

describe("RecordDb", () => {
	it("validates schema", () => {
		const db = tupleDb(new InMemoryBaseOKV(codec.compare))
		createTable(db, "user", t.object({ id: t.string, name: t.string }))
		assert.throws(() => setRecord(db, "user", { id: "1", name: 1 }))
		setRecord(db, "user", { id: "1", name: "John" })
	})

	it("indexes", () => {
		const db = tupleDb(new InMemoryBaseOKV(codec.compare))

		createTable(db, "user", t.object({ id: t.string, first: t.string, last: t.string }))
		createIndex(db, "user", "firstlast", (user) => [user.first, user.last, user.id])

		setRecord(db, "user", { id: "1", first: "John", last: "Doe" })
		setRecord(db, "user", { id: "2", first: "Jane", last: "Smith" })

		createIndex(db, "user", "lastfirst", (user) => [user.last, user.first, user.id])

		const app = db.subspace(["external"])

		assert.deepEqual(
			app
				.subspace(["user"])
				.list()
				.map(({ value }) => value),
			[
				{ id: "1", first: "John", last: "Doe" },
				{ id: "2", first: "Jane", last: "Smith" },
			]
		)

		assert.deepEqual(
			app
				.subspace(["user.firstlast"])
				.list()
				.map(({ key }) => key),
			[
				["Jane", "Smith", "2"],
				["John", "Doe", "1"],
			]
		)

		assert.deepEqual(
			app
				.subspace(["user.lastfirst"])
				.list()
				.map(({ key }) => key),
			[
				["Doe", "John", "1"],
				["Smith", "Jane", "2"],
			]
		)

		setRecord(db, "user", { id: "3", first: "Chet", last: "Corcos" })
		deleteRecord(db, "user", "1")

		assert.deepEqual(
			app.list().map(({ key }) => key),
			[
				["user", "2"],
				["user", "3"],
				["user.firstlast", "Chet", "Corcos", "3"],
				["user.firstlast", "Jane", "Smith", "2"],
				["user.lastfirst", "Corcos", "Chet", "3"],
				["user.lastfirst", "Smith", "Jane", "2"],
			]
		)

		deleteIndex(db, "user", "firstlast")

		assert.deepEqual(
			app.list().map(({ key }) => key),
			[
				["user", "2"],
				["user", "3"],
				["user.lastfirst", "Corcos", "Chet", "3"],
				["user.lastfirst", "Smith", "Jane", "2"],
			]
		)

		deleteTable(db, "user")
		assert.deepEqual(
			app.list().map(({ key }) => key),
			[]
		)
	})
})
