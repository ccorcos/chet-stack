import { describe, it } from "mocha"
import { strict as assert } from "node:assert"
import * as t from "shared/DataType"
import { recordDb } from "./RecordDb"
import { tupleOkv } from "./TupleDb"

describe("RecordDb", () => {
	it("validates schema", () => {
		const db = recordDb(tupleOkv())
		db.setTable({
			table: "user",
			dataType: t.object({
				table: t.literal("user"),
				id: t.string,
				name: t.string,
			}),
		})

		assert.throws(() => db.setRecord({ table: "user", id: "1", name: 1 }))
		db.setRecord({ table: "user", id: "1", name: "John" })
	})

	it("validates optionally", () => {
		const db = recordDb(tupleOkv(), "optional")
		db.setTable({
			table: "user",
			dataType: t.object({
				table: t.literal("user"),
				id: t.string,
				name: t.string,
			}),
		})

		assert.throws(() => db.setRecord({ table: "user", id: "1", name: 1 }))
		db.setRecord({ table: "user", id: "1", name: "John" })
		db.setRecord({ table: "blah", id: "12" })
	})

	it("doesn't validate", () => {
		const db = recordDb(tupleOkv(), "none")
		db.setTable({
			table: "user",
			dataType: t.object({
				table: t.literal("user"),
				id: t.string,
				name: t.string,
			}),
		})

		db.setRecord({ table: "user", id: "1", name: 1 })
		db.setRecord({ table: "user", id: "1", name: "John" })
		db.setRecord({ table: "blah", id: "12" })
	})

	it("indexes", () => {
		const db = recordDb(tupleOkv())

		db.setTable({
			table: "user",
			dataType: t.object({
				table: t.literal("user"),
				id: t.string,
				first: t.string,
				last: t.string,
			}),
		})
		db.createIndex({
			table: "user",
			name: "firstlast",
			fn: (user) => [user.first, user.last, user.id],
		})

		db.setRecord({ table: "user", id: "1", first: "John", last: "Doe" })
		db.setRecord({ table: "user", id: "2", first: "Jane", last: "Smith" })

		db.createIndex({
			table: "user",
			name: "lastfirst",
			fn: (user) => [user.last, user.first, user.id],
		})

		assert.deepEqual(
			db.model.list().map(({ key }) => key),
			[
				["index", "user", "firstlast"],
				["index", "user", "lastfirst"],
				["table", "user"],
			]
		)

		assert.deepEqual(
			db.data.list().map(({ key }) => key),
			[
				["user", "1"],
				["user", "2"],
				["user.firstlast", "Jane", "Smith", "2"],
				["user.firstlast", "John", "Doe", "1"],
				["user.lastfirst", "Doe", "John", "1"],
				["user.lastfirst", "Smith", "Jane", "2"],
			]
		)

		db.setRecord({ table: "user", id: "3", first: "Chet", last: "Corcos" })
		db.deleteRecord({ table: "user", id: "1" })

		assert.deepEqual(
			db.data.list().map(({ key }) => key),
			[
				["user", "2"],
				["user", "3"],
				["user.firstlast", "Chet", "Corcos", "3"],
				["user.firstlast", "Jane", "Smith", "2"],
				["user.lastfirst", "Corcos", "Chet", "3"],
				["user.lastfirst", "Smith", "Jane", "2"],
			]
		)

		db.deleteIndex({ table: "user", name: "firstlast" })

		assert.deepEqual(
			db.data.list().map(({ key }) => key),
			[
				["user", "2"],
				["user", "3"],
				["user.lastfirst", "Corcos", "Chet", "3"],
				["user.lastfirst", "Smith", "Jane", "2"],
			]
		)

		db.deleteTable("user")
		assert.deepEqual(
			db.data.list().map(({ key }) => key),
			[]
		)
		assert.deepEqual(
			db.model.list().map(({ key }) => key),
			[]
		)
	})
})
