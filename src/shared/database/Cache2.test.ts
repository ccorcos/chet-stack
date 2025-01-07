import { strict as assert } from "assert"
import { omit } from "lodash"
import { describe, it } from "mocha"
import { Range, computeCachedRange, decodeRange, encodeRange } from "./Cache2"
import { ListArgs } from "./types"

/** Helper for visualizing ranges. */
function e(str: string) {
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
	e("----------------------"),
	e("----[-----------------"),
	e("----(-----------------"),
	e("----[----------)------"),
	e("----[----------]------"),
	e("----(----------)------"),
	e("----(----------]------"),
	e("---------------]------"),
	e("---------------)------"),
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

/** Includes end value! */
function v(start: number, end: number) {
	return Array.from({ length: end - start + 1 }, (_, i) => i + start)
		.map((i) => i.toString().padStart(2, "0"))
		.map((i) => ({ key: i, value: i }))
}

describe("computeCachedRange", () => {
	const works = (
		args: ListArgs<string>,
		result: { key: string; value: string }[],
		expected?: Range
	) => {
		const range = computeCachedRange(args, result)
		assert.deepEqual(
			range,
			expected === undefined ? omit(args, "limit", "reverse") : expected,
			JSON.stringify({ args, result, expected })
		)
	}

	it("unlimited", () => {
		// All, no data
		works({}, [])

		// One sided, no data
		works({ gt: "00" }, [])
		works({ gte: "00" }, [])
		works({ lt: "04" }, [])
		works({ lte: "04" }, [])

		// Two sides, no data
		works({ gt: "00", lt: "04" }, [])
		works({ gte: "00", lt: "04" }, [])
		works({ gt: "00", lte: "04" }, [])
		works({ gte: "00", lte: "04" }, [])

		// All, with data
		works({}, v(0, 10))

		// One sided, with data
		works({ gt: "00" }, v(1, 10))
		works({ gte: "00" }, v(0, 10))
		works({ lt: "04" }, v(0, 3))
		works({ lte: "04" }, v(0, 4))

		// Two sides, with data
		works({ gt: "00", lt: "04" }, v(1, 3))
		works({ gte: "00", lt: "04" }, v(0, 3))
		works({ gt: "00", lte: "04" }, v(1, 4))
		works({ gte: "00", lte: "04" }, v(0, 4))
	})

	it("limited / hit the limit before the bound", () => {
		// All
		works({ limit: 2 }, v(0, 1), { lte: "01" })

		// One sided
		works({ gt: "00", limit: 2 }, v(1, 2), { gt: "00", lte: "02" })
		works({ gte: "00", limit: 2 }, v(0, 1), { gte: "00", lte: "01" })
		works({ lt: "04", limit: 2 }, v(0, 1), { lte: "01" })
		works({ lte: "04", limit: 2 }, v(0, 1), { lte: "01" })

		// Two sides
		works({ gt: "00", lt: "04", limit: 2 }, v(1, 2), { gt: "00", lte: "02" })
		works({ gte: "00", lt: "04", limit: 2 }, v(0, 1), { gte: "00", lte: "01" })
		works({ gt: "00", lte: "04", limit: 2 }, v(1, 2), { gt: "00", lte: "02" })
		works({ gte: "00", lte: "04", limit: 2 }, v(0, 1), { gte: "00", lte: "01" })
	})

	it("bounded / hit the bound before the limit", () => {
		// All
		works({ limit: 100 }, v(0, 10))

		// One sided
		works({ gt: "00", limit: 100 }, v(1, 10))
		works({ gte: "00", limit: 100 }, v(0, 10))
		works({ lt: "04", limit: 100 }, v(0, 3))
		works({ lte: "04", limit: 100 }, v(0, 4))

		// Two sides
		works({ gt: "00", lt: "04", limit: 100 }, v(1, 3))
		works({ gte: "00", lt: "04", limit: 100 }, v(0, 3))
		works({ gt: "00", lte: "04", limit: 100 }, v(1, 4))
		works({ gte: "00", lte: "04", limit: 100 }, v(0, 4))
	})

	it("reverse", () => {
		// TODO: more exhaustive tests here
	})
})
