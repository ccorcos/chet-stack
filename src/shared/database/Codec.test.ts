import { strict as assert } from "assert"
import { describe, it } from "mocha"
import { codec } from "./Codec"

describe("Codec", () => {
	it("works", () => {
		const encoded = codec.encode({ hello: 12, world: (a, b) => a + b })
		const decoded = codec.decode(encoded)
		assert.equal(decoded.hello, 12)
		assert.equal(decoded.world(1, 2), 3)
	})
})
