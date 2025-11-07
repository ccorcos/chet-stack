import { describe, it } from "mocha"
import { strict as assert } from "node:assert"

describe("Unit Testing", () => {
	it("works", () => {
		assert.ok(true)
		assert.equal(1 + 1, 2)
		assert.deepEqual({}, {})
	})
})
