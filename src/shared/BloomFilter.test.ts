import { describe, it } from "mocha"
import { strict as assert } from "node:assert"
import { BloomFilter } from "./BloomFilter"

describe("BloomFilter", () => {
	it("has expected false positive rate", () => {
		const bloomFilter = new BloomFilter(64, 2)
		const addedStrings = new Set<string>()

		// Add 10 random strings
		for (let i = 0; i < 10; i++) {
			const randomStr = Math.random().toString(36).substring(2, 15)
			bloomFilter.add(randomStr)
			addedStrings.add(randomStr)
		}

		// Verify all added strings are found
		for (const str of addedStrings) {
			assert.ok(bloomFilter.test(str))
		}

		// Test 1000 random strings that weren't added
		let falsePositives = 0
		for (let i = 0; i < 1000; i++) {
			const randomStr = Math.random().toString(36).substring(2, 15)
			if (!addedStrings.has(randomStr) && bloomFilter.test(randomStr)) {
				falsePositives++
			}
		}

		// False positive rate should be less than 10%
		// Expected false positive rate is (1 - e^(-kn/m))^k
		// where k is number of hash functions, n is number of items, m is number of buckets
		const k = bloomFilter.numHashes
		const n = addedStrings.size
		const m = bloomFilter.numBytes
		const expectedRate = Math.pow(1 - Math.exp((-k * n) / m), k)
		const actualRate = falsePositives / 1000
		assert.ok(
			actualRate < expectedRate * 2,
			`False positive rate ${actualRate} is too high compared to ${expectedRate}`
		)
	})

	it("works with same item multiple times", () => {
		const bloomFilter = new BloomFilter(64, 2)
		bloomFilter.add("repeat")
		bloomFilter.add("repeat")
		bloomFilter.add("repeat")
		assert.ok(bloomFilter.test("repeat"))
	})

	it("is deterministic with same inputs", () => {
		const filter1 = new BloomFilter(64, 2)
		const filter2 = new BloomFilter(64, 2)

		// Add same items in same order
		filter1.add("test1")
		filter1.add("test2")
		filter1.add("test3")

		filter2.add("test1")
		filter2.add("test2")
		filter2.add("test3")

		assert.equal(filter1.toString(), filter2.toString())
	})

	it("can serialize and deserialize and find same items", () => {
		const filter1 = new BloomFilter(64, 2)
		filter1.add("test1")
		filter1.add("test2")

		const serialized = filter1.toString()

		const filter2 = new BloomFilter(64, 2)
		filter2.fromString(serialized)

		assert.equal(filter2.toString(), serialized)
		assert.equal(filter2.toString(), filter1.toString())

		// Test that both filters can find the same items
		assert.ok(filter1.test("test1"))
		assert.ok(filter1.test("test2"))
		assert.ok(filter2.test("test1"))
		assert.ok(filter2.test("test2"))
	})
})
