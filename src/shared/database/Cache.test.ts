import { strict as assert } from "assert"
import { omit } from "lodash"
import { describe, it } from "mocha"
import { Cache, computeCachedRange, keyToRange } from "./Cache"
import { Range } from "./Range"
import { ListArgs } from "./types"

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
		const cache = new Cache()
		cache.insert({ gte: "05", lt: "10" }, v(5, 9))
		cache.insert({ gt: "15", lte: "20" }, v(6, 20))

		assert.deepEqual(cache.get("00"), { miss: true })
		assert.deepEqual(cache.get("05"), { hit: "05" })
		assert.deepEqual(cache.get("06"), { hit: "06" })
		assert.deepEqual(cache.get("10"), { miss: true })
		assert.deepEqual(cache.get("15"), { miss: true })
		assert.deepEqual(cache.get("16"), { hit: "16" })
		assert.deepEqual(cache.get("20"), { hit: "20" })
		assert.deepEqual(cache.get("21"), { miss: true })

		assert.deepEqual(cache.list({ gt: "00", lt: "04" }), { miss: true })
		// No suffix support, so this is a miss.
		assert.deepEqual(cache.list({ gt: "01", lt: "08" }), { miss: true })

		// Inside
		assert.deepEqual(cache.list({ gte: "05", lt: "08" }), { hit: v(5, 7) })

		// Bounds
		assert.deepEqual(cache.list({ gte: "05", lt: "10" }), { hit: v(5, 9) })
		assert.deepEqual(cache.list({ gte: "05", lte: "10" }), { prefix: v(5, 9) })
		assert.deepEqual(cache.list({ gt: "05", lte: "10" }), { prefix: v(6, 9) })
		assert.deepEqual(cache.list({ gt: "05", lt: "10" }), { hit: v(6, 9) })
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
		const cache = new Cache()
		const cb1 = func()
		const cb2 = func()
		const unsub1 = cache.subscribe({ gte: "05", lt: "10" }, cb1)
		const unsub2 = cache.subscribe({ gt: "08", lte: "20" }, cb2)

		const emitKeys = (keys: string[]) => cache.emit(keys.map(keyToRange))

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
