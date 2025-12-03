import { omit } from "lodash-es"
import { describe, it } from "mocha"
import { strict as assert } from "node:assert"
import { Cache, cachedRange, keyToRange } from "./Cache"
import { Range } from "./Range"
import { ListArgs } from "./types"

/** Includes end value! */
function kv(start: number, end: number) {
	return Array.from({ length: end - start + 1 }, (_, i) => i + start)
		.map((i) => i.toString().padStart(2, "0"))
		.map((i) => ({ key: i, value: i }))
}

describe("computeCachedRange", () => {
	const works = (
		args: ListArgs<string>,
		result: { key: string; value: string }[],
		expected?: Range<string>
	) => {
		const range = cachedRange(args, result)
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
		works({}, kv(0, 10))

		// One sided, with data
		works({ gt: "00" }, kv(1, 10))
		works({ gte: "00" }, kv(0, 10))
		works({ lt: "04" }, kv(0, 3))
		works({ lte: "04" }, kv(0, 4))

		// Two sides, with data
		works({ gt: "00", lt: "04" }, kv(1, 3))
		works({ gte: "00", lt: "04" }, kv(0, 3))
		works({ gt: "00", lte: "04" }, kv(1, 4))
		works({ gte: "00", lte: "04" }, kv(0, 4))
	})

	it("limited / hit the limit before the bound", () => {
		// All
		works({ limit: 2 }, kv(0, 1), { lte: "01" })

		// One sided
		works({ gt: "00", limit: 2 }, kv(1, 2), { gt: "00", lte: "02" })
		works({ gte: "00", limit: 2 }, kv(0, 1), { gte: "00", lte: "01" })
		works({ lt: "04", limit: 2 }, kv(0, 1), { lte: "01" })
		works({ lte: "04", limit: 2 }, kv(0, 1), { lte: "01" })

		// Two sides
		works({ gt: "00", lt: "04", limit: 2 }, kv(1, 2), { gt: "00", lte: "02" })
		works({ gte: "00", lt: "04", limit: 2 }, kv(0, 1), { gte: "00", lte: "01" })
		works({ gt: "00", lte: "04", limit: 2 }, kv(1, 2), { gt: "00", lte: "02" })
		works({ gte: "00", lte: "04", limit: 2 }, kv(0, 1), { gte: "00", lte: "01" })
	})

	it("bounded / hit the bound before the limit", () => {
		// All
		works({ limit: 100 }, kv(0, 10))

		// One sided
		works({ gt: "00", limit: 100 }, kv(1, 10))
		works({ gte: "00", limit: 100 }, kv(0, 10))
		works({ lt: "04", limit: 100 }, kv(0, 3))
		works({ lte: "04", limit: 100 }, kv(0, 4))

		// Two sides
		works({ gt: "00", lt: "04", limit: 100 }, kv(1, 3))
		works({ gte: "00", lt: "04", limit: 100 }, kv(0, 3))
		works({ gt: "00", lte: "04", limit: 100 }, kv(1, 4))
		works({ gte: "00", lte: "04", limit: 100 }, kv(0, 4))
	})

	it("reverse / limited", () => {
		// TODO: more exhaustive tests here

		// All
		works({ limit: 2, reverse: true }, kv(9, 10).reverse(), { gte: "09" })

		// One sided
		works({ gt: "00", limit: 2, reverse: true }, kv(9, 10).reverse(), { gte: "09" })
		works({ gte: "00", limit: 2, reverse: true }, kv(9, 10).reverse(), { gte: "09" })
		works({ lt: "04", limit: 2, reverse: true }, kv(2, 3).reverse(), { gte: "02", lt: "04" })
		works({ lte: "04", limit: 2, reverse: true }, kv(3, 4).reverse(), { gte: "03", lte: "04" })

		// Two sides
		works({ gt: "00", lt: "04", limit: 2, reverse: true }, kv(2, 3).reverse(), {
			gte: "02",
			lt: "04",
		})
		works({ gte: "00", lt: "04", limit: 2, reverse: true }, kv(2, 3).reverse(), {
			gte: "02",
			lt: "04",
		})
		works({ gt: "00", lte: "04", limit: 2, reverse: true }, kv(3, 4).reverse(), {
			gte: "03",
			lte: "04",
		})
		works({ gte: "00", lte: "04", limit: 2, reverse: true }, kv(3, 4).reverse(), {
			gte: "03",
			lte: "04",
		})
	})
})

describe("Cache", () => {
	it("works", () => {
		const cache = new Cache()
		cache.insert({ gte: "05", lt: "10" }, kv(5, 9))
		cache.insert({ gt: "15", lte: "20" }, kv(6, 20))

		const get = (key: string) => {
			const result = cache.list({ gte: key, lte: key })
			if (result.hit) return { hit: result.hit[0].value }
			return { miss: true }
		}

		assert.deepEqual(get("00"), { miss: true })
		assert.deepEqual(get("05"), { hit: "05" })
		assert.deepEqual(get("06"), { hit: "06" })
		assert.deepEqual(get("10"), { miss: true })
		assert.deepEqual(get("15"), { miss: true })
		assert.deepEqual(get("16"), { hit: "16" })
		assert.deepEqual(get("20"), { hit: "20" })
		assert.deepEqual(get("21"), { miss: true })

		assert.deepEqual(cache.list({ gt: "00", lt: "04" }), { miss: true })
		// No suffix support, so this is a miss.
		assert.deepEqual(cache.list({ gt: "01", lt: "08" }), { miss: true })

		// Inside
		assert.deepEqual(cache.list({ gte: "05", lt: "08" }), { hit: kv(5, 7) })

		// Bounds
		assert.deepEqual(cache.list({ gte: "05", lt: "10" }), { hit: kv(5, 9) })
		assert.deepEqual(cache.list({ gte: "05", lte: "10" }), { prefix: kv(5, 9) })
		assert.deepEqual(cache.list({ gt: "05", lte: "10" }), { prefix: kv(6, 9) })
		assert.deepEqual(cache.list({ gt: "05", lt: "10" }), { hit: kv(6, 9) })
	})

	it("Joined ranges", () => {
		const cache = new Cache()
		cache.insert({ limit: 2 }, kv(0, 1))
		cache.insert({ gt: "01", limit: 2 }, kv(2, 3))

		assert.deepEqual(cache.list({ limit: 3 }), { hit: kv(0, 2) })
		assert.deepEqual(cache.list({ limit: 4 }), { hit: kv(0, 3) })
		assert.deepEqual(cache.list({ limit: 5 }), { prefix: kv(0, 3) })
	})

	it("Joined ranges - reversed", () => {
		const cache = new Cache()
		cache.insert({ limit: 2, reverse: true }, kv(2, 3).reverse())
		cache.insert({ lt: "02", limit: 2, reverse: true }, kv(0, 1).reverse())

		assert.deepEqual(cache.list({ limit: 3, reverse: true }), { hit: kv(1, 3).reverse() })
		assert.deepEqual(cache.list({ limit: 4, reverse: true }), { hit: kv(0, 3).reverse() })
		assert.deepEqual(cache.list({ limit: 5, reverse: true }), { prefix: kv(0, 3).reverse() })
	})

	it("Optimistic writes", () => {
		// writing to a cache, then inserting on top of it doesn't overwrite the pending writes.
		const cache = new Cache()

		cache.insert({ gte: "00", lte: "10" }, kv(0, 10))
		const cleanup1 = cache.write({ set: [{ key: "00", value: "xx" }], delete: ["10"] })
		assert.deepEqual(cache.list({ gte: "00", lte: "10" }), {
			hit: [{ key: "00", value: "xx" }, ...kv(1, 9)],
		})

		// Stays the same.
		cache.insert({ gte: "00", lte: "10" }, kv(0, 10))
		assert.deepEqual(cache.list({ gte: "00", lte: "10" }), {
			hit: [{ key: "00", value: "xx" }, ...kv(1, 9)],
		})

		// Adds another reference count.
		const cleanup2 = cache.write({ set: [{ key: "00", value: "yy" }] })
		assert.deepEqual(cache.list({ gte: "00", lte: "10" }), {
			hit: [{ key: "00", value: "yy" }, ...kv(1, 9)],
		})

		// Stays the same.
		cache.insert({ gte: "00", lte: "10" }, kv(0, 10))
		assert.deepEqual(cache.list({ gte: "00", lte: "10" }), {
			hit: [{ key: "00", value: "yy" }, ...kv(1, 9)],
		})

		// Removes reference count on 10, but we still have a reference count on 00.
		// console.log("REFS", cache.refs.items)
		cleanup1()
		// console.log("REFS", cache.refs.items)

		assert.deepEqual(cache.list({ gte: "00", lte: "10" }), {
			hit: [{ key: "00", value: "yy" }, ...kv(1, 9)],
		})
		// Overwrites 10 but not 00.
		cache.insert({ gte: "00", lte: "10" }, kv(0, 10))
		assert.deepEqual(cache.list({ gte: "00", lte: "10" }), {
			hit: [{ key: "00", value: "yy" }, ...kv(1, 10)],
		})

		// Removes reference count on 00.
		cleanup2()
		assert.deepEqual(cache.list({ gte: "00", lte: "10" }), {
			hit: [{ key: "00", value: "yy" }, ...kv(1, 10)],
		})

		// Overwrites 10 but not 00.
		cache.insert({ gte: "00", lte: "10" }, kv(0, 10))
		assert.deepEqual(cache.list({ gte: "00", lte: "10" }), { hit: kv(0, 10) })
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

	it("subscribe / emit", () => {
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
})
