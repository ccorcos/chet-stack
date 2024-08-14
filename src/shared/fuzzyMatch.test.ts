import { strict as assert } from "assert"
import { describe, it } from "mocha"
import { fuzzyMatch } from "./fuzzyMatch"

describe("FuzzyMatch", () => {
	it("Matches a whole string", () => {
		const result = fuzzyMatch("abc", "abc")
		assert.ok(result)
		assert.deepEqual(result, [{ match: "abc" }])
	})

	it("Matches a prefix", () => {
		const result = fuzzyMatch("ab", "abc")
		assert.ok(result)
		assert.deepEqual(result, [{ match: "ab" }, { skip: "c" }])
	})

	it("Matches word gaps", () => {
		const result = fuzzyMatch("sil", "Simon Last")
		assert.ok(result)
		assert.deepEqual(result, [{ match: "Si" }, { skip: "mon " }, { match: "L" }, { skip: "ast" }])
	})

	it("Symbols treated like whitespace", () => {
		const result = fuzzyMatch("ac", "Apple-cinnamon")
		assert.ok(result)
		assert.deepEqual(result, [
			{ match: "A" },
			{ skip: "pple-" },
			{ match: "c" },
			{ skip: "innamon" },
		])
	})

	it("Backtracks when shared prefix", () => {
		const result = fuzzyMatch("im", "Insert image")
		assert.ok(result)
		assert.deepEqual(result, [{ skip: "Insert " }, { match: "im" }, { skip: "age" }])
	})

	it("Harder backtrack", () => {
		const result = fuzzyMatch("abcd", "abc bcd")
		assert.ok(result)
		assert.deepEqual(result, [{ match: "a" }, { skip: "bc " }, { match: "bcd" }])
	})
})
