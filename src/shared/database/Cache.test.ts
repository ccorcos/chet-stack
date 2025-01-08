import { strict as assert } from "assert"
import { omit } from "lodash"
import { describe, it } from "mocha"
import {
	Range,
	computeCachedRange,
	decodeRange,
	encodeRange,
	insertCache,
	keyToRange,
	localEmit,
	localGet,
	localList,
	localSubscribe,
	overlaps,
} from "./Cache"
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

	it("reverse / limited", () => {
		// TODO: more exhaustive tests here

		// All
		works({ limit: 2, reverse: true }, v(9, 10).reverse(), { gte: "09" })

		// One sided
		works({ gt: "00", limit: 2, reverse: true }, v(9, 10).reverse(), { gte: "09" })
		works({ gte: "00", limit: 2, reverse: true }, v(9, 10).reverse(), { gte: "09" })
		works({ lt: "04", limit: 2, reverse: true }, v(2, 3).reverse(), { gte: "02", lt: "04" })
		works({ lte: "04", limit: 2, reverse: true }, v(3, 4).reverse(), { gte: "03", lte: "04" })

		// Two sides
		works({ gt: "00", lt: "04", limit: 2, reverse: true }, v(2, 3).reverse(), {
			gte: "02",
			lt: "04",
		})
		works({ gte: "00", lt: "04", limit: 2, reverse: true }, v(2, 3).reverse(), {
			gte: "02",
			lt: "04",
		})
		works({ gt: "00", lte: "04", limit: 2, reverse: true }, v(3, 4).reverse(), {
			gte: "03",
			lte: "04",
		})
		works({ gte: "00", lte: "04", limit: 2, reverse: true }, v(3, 4).reverse(), {
			gte: "03",
			lte: "04",
		})
	})
})

describe("cache", () => {
	it("works", () => {
		insertCache({ gte: "05", lt: "10" }, v(5, 9))
		insertCache({ gt: "15", lte: "20" }, v(6, 20))

		assert.deepEqual(localGet("00"), { miss: true })
		assert.deepEqual(localGet("05"), { hit: "05" })
		assert.deepEqual(localGet("06"), { hit: "06" })
		assert.deepEqual(localGet("10"), { miss: true })
		assert.deepEqual(localGet("15"), { miss: true })
		assert.deepEqual(localGet("16"), { hit: "16" })
		assert.deepEqual(localGet("20"), { hit: "20" })
		assert.deepEqual(localGet("21"), { miss: true })

		assert.deepEqual(localList({ gt: "00", lt: "04" }), { miss: true })
		// No suffix support, so this is a miss.
		assert.deepEqual(localList({ gt: "01", lt: "08" }), { miss: true })

		// Inside
		assert.deepEqual(localList({ gte: "05", lt: "08" }), { hit: v(5, 7) })

		// Bounds
		assert.deepEqual(localList({ gte: "05", lt: "10" }), { hit: v(5, 9) })
		assert.deepEqual(localList({ gte: "05", lte: "10" }), { prefix: v(5, 9) })
		assert.deepEqual(localList({ gt: "05", lte: "10" }), { prefix: v(6, 9) })
		assert.deepEqual(localList({ gt: "05", lt: "10" }), { hit: v(6, 9) })
	})
})

interface Func {
	(...args: any[]): any
	called: number
}

function func(): Func {
	const f = () => {
		f.called++
	}
	f.called = 0
	return f
}

describe("subscribe / emit", () => {
	it("works", () => {
		const cb1 = func()
		const cb2 = func()
		const unsub1 = localSubscribe({ gte: "05", lt: "10" }, cb1)
		const unsub2 = localSubscribe({ gt: "08", lte: "20" }, cb2)

		const emitKeys = (keys: string[]) => localEmit(keys.map(keyToRange))

		emitKeys(["05"])
		assert.equal(cb1.called, 1)
		cb1.called = 0
		assert.equal(cb2.called, 0)

		emitKeys(["06", "08"])
		assert.equal(cb1.called, 1)
		cb1.called = 0
		assert.equal(cb2.called, 0)

		emitKeys(["09"])
		assert.equal(cb1.called, 1)
		cb1.called = 0
		assert.equal(cb2.called, 1)
		cb2.called = 0

		emitKeys(["10", "11"])
		assert.equal(cb1.called, 0)
		assert.equal(cb2.called, 1)
		cb2.called = 0

		emitKeys(["15"])
		assert.equal(cb2.called, 1)

		unsub1()
		unsub2()
	})

	// TODO: test emitting actual ranges.
})

describe("overlaps", () => {
	it("works", () => {
		const yes = (a: Range, b: Range, message?: string) => {
			assert.ok(overlaps(a, b), message ?? JSON.stringify({ a, b }))
			assert.ok(overlaps(b, a), message ?? JSON.stringify({ a, b }))
		}

		const no = (a: Range, b: Range, message?: string) => {
			assert.ok(!overlaps(a, b), message ?? JSON.stringify({ a, b }))
			assert.ok(!overlaps(b, a), message ?? JSON.stringify({ a, b }))
		}

		// Empty ranges
		yes({}, {})
		yes({}, { gt: "3" })
		yes({}, { gte: "3" })
		yes({}, { lt: "7" })
		yes({}, { lte: "7" })
		yes({}, { gt: "3", lt: "7" })
		yes({}, { gt: "3", lte: "7" })
		yes({}, { gte: "3", lt: "7" })
		yes({}, { gte: "3", lte: "7" })

		// Left overlap
		yes({ lt: "4" }, { gt: "3" })
		yes({ lt: "4" }, { gte: "3" })
		yes({ lte: "4" }, { gt: "3" })
		yes({ lte: "4" }, { gte: "3" })

		// Left boundary case
		yes({ lte: "3" }, { gte: "3" })
		no({ lt: "3" }, { gte: "3" })
		no({ lte: "3" }, { gt: "3" })
		no({ lt: "3" }, { gt: "3" })

		// Right overlap
		yes({ gt: "3" }, { lt: "4" })
		yes({ gt: "3" }, { lte: "4" })
		yes({ gte: "3" }, { lt: "4" })
		yes({ gte: "3" }, { lte: "4" })

		// Right boundary case
		yes({ gte: "3" }, { lte: "3" })
		no({ gt: "3" }, { lt: "3" })
		no({ gt: "3" }, { lte: "2" })
		no({ gt: "3" }, { lt: "2" })

		// Inside/outside
		yes({ gt: "3", lt: "7" }, { gt: "4", lt: "6" })
		no({ gt: "3", lt: "7" }, { gt: "1", lt: "2" })

		// AI below this comment.
		// Overlapping ranges
		yes({ gt: "1", lt: "5" }, { gt: "3", lt: "7" })

		// Adjacent ranges
		yes({ lte: "5" }, { gte: "5" })

		// Test non-overlapping cases
		no({ lt: "5" }, { gt: "5" })

		// Contained ranges
		yes({ gt: "2", lt: "8" }, { gt: "4", lt: "6" })
		yes({ gt: "4", lt: "6" }, { gt: "2", lt: "8" })

		// Disjoint ranges
		no({ lt: "2" }, { gt: "5" })
		no({ gt: "5" }, { lt: "2" })

		// Mixed inclusive/exclusive bounds
		yes({ gte: "5" }, { lte: "5" })
		yes({ gt: "2", lte: "5" }, { gte: "5", lt: "8" })
		no({ gt: "2", lt: "5" }, { gt: "5", lt: "8" })

		// One-sided ranges
		yes({ gt: "5" }, { lt: "8" })
		yes({ gte: "5" }, {})
		yes({}, { lte: "5" })
	})
})
