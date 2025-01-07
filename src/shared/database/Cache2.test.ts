import { strict as assert } from "assert"
import { describe, it } from "mocha"
import { Range, decodeRange, encodeRange } from "./Cache2"

/** Helper for visualizing ranges. */
function $(str: string) {
	const gte = str.indexOf("[")
	const gt = str.indexOf("(")
	const lte = str.indexOf("]")
	const lt = str.indexOf(")")

	const range: Range = {}
	if (gte !== -1) range.gte = gte.toString().padStart(2, "0")
	if (gt !== -1) range.gt = gt.toString().padStart(2, "0")
	if (lte !== -1) range.lte = lte.toString().padStart(2, "0")
	if (lt !== -1) range.lt = lt.toString().padStart(2, "0")

	return range
}

const rangeTypes = [
	$("----------------------"),
	$("----[-----------------"),
	$("----(-----------------"),
	$("----[----------)------"),
	$("----[----------]------"),
	$("----(----------)------"),
	$("----(----------]------"),
	$("---------------]------"),
	$("---------------)------"),
]

describe("encodeRange", () => {
	it("encode and decode work", () => {
		const works = (r: Range) => {
			const result = decodeRange(encodeRange(r))
			assert.deepEqual(result, r)
		}
		for (const range of rangeTypes) {
			works(range)
		}
	})

	it("encodes with proper order", () => {
		const [a] = encodeRange({ gte: "x" })
		const [b] = encodeRange({ gt: "x" })
		assert.ok(a < b, "gte < gt")

		const [_1, c] = encodeRange({ lte: "x" })
		const [_2, d] = encodeRange({ lt: "x" })
		assert.ok(c > d, "lte > lt")
	})

	// Test that the bounds stuff works and cache ranges logic works.
})
