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
		assert.deepEqual(cache.list({ gte: "00", lte: "10" }), { hit: kv(0, 10) })

		const cleanup1 = cache.write({ set: [{ key: "00", value: "xx" }], delete: ["10"] })
		assert.deepEqual(cache.list({ gte: "00", lte: "10" }), {
			hit: [{ key: "00", value: "xx" }, ...kv(1, 9)],
		})

		cache.insert({ gte: "00", lte: "10" }, kv(0, 10))
		assert.deepEqual(cache.list({ gte: "00", lte: "10" }), {
			hit: [{ key: "00", value: "xx" }, ...kv(1, 9)],
		})

		const cleanup2 = cache.write({ set: [{ key: "00", value: "yy" }] })
		assert.deepEqual(cache.list({ gte: "00", lte: "10" }), {
			hit: [{ key: "00", value: "yy" }, ...kv(1, 9)],
		})

		cache.insert({ gte: "00", lte: "10" }, kv(0, 10))
		assert.deepEqual(cache.list({ gte: "00", lte: "10" }), {
			hit: [{ key: "00", value: "yy" }, ...kv(1, 9)],
		})

		console.log("\n--- Resolve OW1 ---")
		cache.resolveOptimisticWrite(cleanup1)
		console.log("After resolve OW1, cache.data:", cache.data.list())
		console.log("After resolve OW1, cache.list:", cache.list({ gte: "00", lte: "10" }))
		console.log("After resolve OW1, cache.refs.items:", cache.refs.items)
		assert.deepEqual(cache.list({ gte: "00", lte: "10" }), {
			hit: [{ key: "00", value: "yy" }, ...kv(1, 10)], // This is the failing assertion
		})

		console.log("\n--- Insert after resolve OW1 ---")
		cache.insert({ gte: "00", lte: "10" }, kv(0, 10))
		console.log("After insert, cache.data:", cache.data.list())
		console.log("After insert, cache.list:", cache.list({ gte: "00", lte: "10" }))
		console.log("After insert, cache.refs.items:", cache.refs.items)
		assert.deepEqual(cache.list({ gte: "00", lte: "10" }), {
			hit: [{ key: "00", value: "yy" }, ...kv(1, 10)],
		})

		console.log("\n--- Resolve OW2 ---")
		cache.resolveOptimisticWrite(cleanup2)
		console.log("After resolve OW2, cache.data:", cache.data.list())
		console.log("After resolve OW2, cache.list:", cache.list({ gte: "00", lte: "10" }))
		console.log("After resolve OW2, cache.refs.items:", cache.refs.items)
		assert.deepEqual(cache.list({ gte: "00", lte: "10" }), { hit: kv(0, 10) })

		console.log("\n--- Insert after resolve OW2 ---")
		cache.insert({ gte: "00", lte: "10" }, kv(0, 10))
		console.log("After insert, cache.data:", cache.data.list())
		console.log("After insert, cache.list:", cache.list({ gte: "00", lte: "10" }))
		console.log("After insert, cache.refs.items:", cache.refs.items)
		assert.deepEqual(cache.list({ gte: "00", lte: "10" }), { hit: kv(0, 10) })
	})

	it("applyHistoryUpdate reconciles optimistic writes", () => {
		const cache = new Cache<string, string>()
		const cb = func()
		cache.subscribe({ gte: "00", lte: "10" }, cb)

		// Initial data
		cache.insert({ gte: "00", lte: "10" }, kv(0, 10))
		cb.called = 0

		// Optimistic write
		const optimisticId1 = cache.write({ set: [{ key: "01", value: "optimistic" }] })
		assert.equal(cache.list({ gte: "01", lte: "01" }).hit![0].value, "optimistic")
		assert.equal(cb.called, 1)
		cb.called = 0

		// Simulate server confirming the optimistic write
		cache.applyHistoryUpdate({ set: [{ key: "01", value: "server_confirmed" }] })
		assert.equal(cache.list({ gte: "01", lte: "01" }).hit![0].value, "server_confirmed")
		assert.equal(cache.optimisticWrites.has(optimisticId1), false, "Optimistic write should be resolved")
		assert.equal(cache.refs.items.find(item => item.key === "01"), undefined, "Ref count for '01' should be removed")
		assert.equal(cb.called, 1, "Listeners should be notified of server update")
		cb.called = 0

		// Another optimistic write for an unresolved key
		const optimisticId2 = cache.write({ set: [{ key: "02", value: "optimistic2" }] })
		assert.equal(cache.list({ gte: "02", lte: "02" }).hit![0].value, "optimistic2")
		assert.equal(cb.called, 1)
		cb.called = 0

		// Server updates a different key, optimisticId2 should remain pending
		cache.applyHistoryUpdate({ set: [{ key: "03", value: "server_unrelated" }] })
		assert.equal(cache.list({ gte: "02", lte: "02" }).hit![0].value, "optimistic2")
		assert.equal(cache.optimisticWrites.has(optimisticId2), true, "Optimistic write 2 should still be pending")
		assert.equal(cb.called, 1)
		cb.called = 0

		// Server confirms optimisticId2
		cache.applyHistoryUpdate({ set: [{ key: "02", value: "server_confirmed2" }] })
		assert.equal(cache.list({ gte: "02", lte: "02" }).hit![0].value, "server_confirmed2")
		assert.equal(cache.optimisticWrites.has(optimisticId2), false, "Optimistic write 2 should be resolved")
		assert.equal(cb.called, 1)
		cb.called = 0
	})

	it("resolveOptimisticWrite explicitly removes pending writes", () => {
		const cache = new Cache<string, string>()
		const cb = func()
		cache.subscribe({ gte: "00", lte: "10" }, cb)

		cache.insert({ gte: "00", lte: "10" }, kv(0, 10))
		cb.called = 0

		const optimisticId = cache.write({ set: [{ key: "05", value: "optimistic_five" }] })
		assert.equal(cache.list({ gte: "05", lte: "05" }).hit![0].value, "optimistic_five")
		assert.equal(cache.optimisticWrites.has(optimisticId), true)
		assert.equal(cache.refs.items.find(item => item.key === "05")?.ref, 1)
		assert.equal(cb.called, 1)
		cb.called = 0

		cache.resolveOptimisticWrite(optimisticId)
		// The optimistic write is cleared from pending. The value reverts to base data.
		assert.equal(cache.list({ gte: "05", lte: "05" }).hit![0].value, "05") // Reverts to original '05'
		assert.equal(cache.optimisticWrites.has(optimisticId), false)
		assert.equal(cache.refs.items.find(item => item.key === "05"), undefined, "Ref count for '05' should be removed")
		assert.equal(cb.called, 1, "Listeners should be notified of change due to resolution")
		cb.called = 0

		// Resolving a non-existent ID should warn but not error
		const consoleWarn = console.warn
		let warned = false
		console.warn = () => { warned = true }
		cache.resolveOptimisticWrite("non_existent_id")
		assert.ok(warned, "Should warn for non-existent ID")
		console.warn = consoleWarn // Restore original
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
