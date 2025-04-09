// TODO: query for batch fetching from the client
// TODO: indexing for the client
// TODO: basic schema enforcement.

import { strict as assert } from "assert"
import { describe, it } from "mocha"
import { InMemoryBaseOKV } from "./InMemoryBaseOKV"
import { okv, reactiveOkv, tupleOkv } from "./okv2"
import { RangeEmitter } from "./RangeEmitter"

describe("okv", () => {
	it("works", () => {
		assert.ok(true)
		assert.equal(1 + 1, 2)
		assert.deepEqual({}, {})
	})
})

describe("StringDb", () => {
	it("works", () => {
		const base = new InMemoryBaseOKV<string, string>()

		const db = reactiveOkv(base, new RangeEmitter<string>())

		// reactivity
		// set/get
		// prefix/subspace
		// query
		// LATER: transaction
		// index
		// LATER: schema
	})
})

describe("StringJSONDb", () => {
	it("works", () => {
		const base = new InMemoryBaseOKV<string, string>()

		const db = okv(base)

		// reactivity
		// set/get
		// prefix/subspace
		// query, cache
		// index, schema
	})
})

describe("TupleJSONDb", () => {
	it("works", () => {
		const base = new InMemoryBaseOKV<string, string>()
		const db = tupleOkv(base)

		// set/get
		// prefix/subspace
		// reactivity
		// query, cache
		// index, schema
	})
})
