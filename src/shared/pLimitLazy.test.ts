import { describe, it } from "mocha"
import { strict as assert } from "node:assert"
import { collect } from "./collect"
import { pLimitLazy } from "./pLimitLazy"

// Helper function to create an async generator from an array
async function* asyncGenerator<T>(items: T[]): AsyncGenerator<T> {
	for (const item of items) {
		yield item
	}
}

// Helper to simulate async processing with delays
function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

describe("pLimitLazy", () => {
	it("processes items with concurrency limit", async () => {
		const items = [1, 2, 3, 4, 5]
		const results: number[] = []

		const processor = async (item: number) => {
			await delay(10)
			return item * 2
		}

		const generator = pLimitLazy(2, asyncGenerator(items), processor)
		const processed = await collect(generator)

		assert.deepEqual(processed, [2, 4, 6, 8, 10])
	})

	it("preserves order when items complete out of order", async () => {
		const items = [1, 2, 3, 4]

		// Items will complete in reverse order
		const processor = async (item: number) => {
			await delay((5 - item) * 10)
			return item * 2
		}

		const generator = pLimitLazy(4, asyncGenerator(items), processor)
		const processed = await collect(generator)

		// Despite completing out of order, results should be in input order
		assert.deepEqual(processed, [2, 4, 6, 8])
	})

	it("works with concurrency of 1", async () => {
		const items = [1, 2, 3]
		let concurrentCount = 0
		let maxConcurrent = 0

		const processor = async (item: number) => {
			concurrentCount++
			maxConcurrent = Math.max(maxConcurrent, concurrentCount)
			await delay(10)
			concurrentCount--
			return item * 2
		}

		const generator = pLimitLazy(1, asyncGenerator(items), processor)
		const processed = await collect(generator)

		assert.deepEqual(processed, [2, 4, 6])
		assert.equal(maxConcurrent, 1, "Should never exceed concurrency of 1")
	})

	it("handles concurrency greater than number of items", async () => {
		const items = [1, 2, 3]

		const processor = async (item: number) => {
			await delay(10)
			return item * 2
		}

		const generator = pLimitLazy(10, asyncGenerator(items), processor)
		const processed = await collect(generator)

		assert.deepEqual(processed, [2, 4, 6])
	})

	it("handles empty generator", async () => {
		const items: number[] = []

		const processor = async (item: number) => {
			return item * 2
		}

		const generator = pLimitLazy(2, asyncGenerator(items), processor)
		const processed = await collect(generator)

		assert.deepEqual(processed, [])
	})

	it("properly limits concurrency", async () => {
		const items = [1, 2, 3, 4, 5, 6, 7, 8]
		const concurrency = 3
		let concurrentCount = 0
		let maxConcurrent = 0

		const processor = async (item: number) => {
			concurrentCount++
			maxConcurrent = Math.max(maxConcurrent, concurrentCount)
			await delay(20)
			concurrentCount--
			return item
		}

		const generator = pLimitLazy(concurrency, asyncGenerator(items), processor)
		await collect(generator)

		assert.ok(
			maxConcurrent <= concurrency,
			`Max concurrent (${maxConcurrent}) should not exceed limit (${concurrency})`
		)
		assert.ok(maxConcurrent >= concurrency, `Should reach the concurrency limit (${concurrency})`)
	})

	it("handles errors in processor", async () => {
		const items = [1, 2, 3, 4]

		const processor = async (item: number) => {
			await delay(10)
			if (item === 3) {
				throw new Error(`Error processing item ${item}`)
			}
			return item * 2
		}

		const generator = pLimitLazy(2, asyncGenerator(items), processor)

		try {
			await collect(generator)
			assert.fail("Should have thrown an error")
		} catch (error: any) {
			assert.ok(error.message.includes("Error processing item 3"))
		}
	})

	it("yields results as they become ready in order", async () => {
		const items = [1, 2, 3, 4, 5]
		const yielded: number[] = []

		// First item takes longest
		const processor = async (item: number) => {
			if (item === 1) {
				await delay(100)
			} else {
				await delay(10)
			}
			return item * 2
		}

		const generator = pLimitLazy(5, asyncGenerator(items), processor)

		// Collect with tracking
		for await (const result of generator) {
			yielded.push(result)
		}

		// Should still maintain order despite first item being slowest
		assert.deepEqual(yielded, [2, 4, 6, 8, 10])
	})

	it("processes all items even with varying delays", async () => {
		const items = Array.from({ length: 10 }, (_, i) => i + 1)

		const processor = async (item: number) => {
			// Random delays to simulate real-world variability
			await delay(Math.random() * 20)
			return item
		}

		const generator = pLimitLazy(3, asyncGenerator(items), processor)
		const processed = await collect(generator)

		assert.equal(processed.length, items.length)
		assert.deepEqual(processed, items)
	})

	it("works with synchronous processor", async () => {
		const items = [1, 2, 3, 4, 5]

		const processor = async (item: number) => {
			return item * 2
		}

		const generator = pLimitLazy(2, asyncGenerator(items), processor)
		const processed = await collect(generator)

		assert.deepEqual(processed, [2, 4, 6, 8, 10])
	})

	it("handles promises that resolve immediately", async () => {
		const items = [1, 2, 3]

		const processor = async (item: number) => {
			return Promise.resolve(item * 2)
		}

		const generator = pLimitLazy(2, asyncGenerator(items), processor)
		const processed = await collect(generator)

		assert.deepEqual(processed, [2, 4, 6])
	})
})
