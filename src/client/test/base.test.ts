import { strict as assert } from "node:assert"
import { describe, it } from "vitest"

describe("Unit Testing", () => {
	it("works", () => {
		assert.ok(true)
		assert.equal(1 + 1, 2)
		assert.deepEqual({}, {})
	})
})
