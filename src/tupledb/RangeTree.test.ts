import { describe, it } from "mocha"
import { strict as assert } from "node:assert"
import { RangeTree } from "./RangeTree"

describe("RangeTree", () => {
	it("overlap", () => {
		const tree = new RangeTree<number, number, number>()

		const items = [
			{ range: { gt: 0, lt: 10 }, key: 1, value: 1 },
			{ range: { gt: 5, lt: 15 }, key: 2, value: 2 },
			{ range: { gt: 10, lt: 20 }, key: 3, value: 3 },
			{ range: { gt: 15, lt: 25 }, key: 4, value: 4 },
			{ range: { gt: 20, lt: 30 }, key: 5, value: 5 },
		]
		for (const item of items) tree.set(item)

		// Everything.
		assert.deepEqual(tree.overlap(), items)

		// Basic overlap.
		assert.deepEqual(tree.overlap({ gt: 1, lt: 11 }), items.slice(0, 3))

		// No overlap left side.
		assert.deepEqual(tree.overlap({ gt: -11, lt: -1 }), [])

		// No overlap left side boundary
		assert.deepEqual(tree.overlap({ gt: -11, lte: 0 }), [])

		// A single point.
		assert.deepEqual(tree.overlap({ gte: 10, lte: 10 }), items.slice(1, 2))
		// NOTE: we have tests for compareRange in Range.test.ts so we don't need to be exhaustive here.
	})

	it("updates", () => {
		const tree = new RangeTree<number, number, number>()

		const items = [
			{ range: { gt: 0, lt: 10 }, key: 1, value: 1 },
			{ range: { gt: 5, lt: 15 }, key: 2, value: 2 },
			{ range: { gt: 10, lt: 20 }, key: 3, value: 3 },
			{ range: { gt: 15, lt: 25 }, key: 4, value: 4 },
			{ range: { gt: 20, lt: 30 }, key: 5, value: 5 },
		]
		for (const item of items) tree.set(item)

		// Update a value
		tree.set({ range: { gt: 5, lt: 15 }, key: 2, value: 200 })
		assert.deepEqual(tree.overlap({ gte: 10, lte: 10 }), [
			{ range: { gt: 5, lt: 15 }, key: 2, value: 200 },
		])

		// Delete a value
		tree.delete({ key: 2 })
		assert.deepEqual(tree.overlap({ gte: 10, lte: 10 }), [])

		// Reinsert the original value
		tree.set({ range: { gt: 5, lt: 15 }, key: 2, value: 2 })
		assert.deepEqual(tree.overlap({ gte: 10, lte: 10 }), [
			{ range: { gt: 5, lt: 15 }, key: 2, value: 2 },
		])

		// Add another value at the same exact range with a different key
		tree.set({ range: { gt: 5, lt: 15 }, key: -1, value: -1 })
		assert.deepEqual(tree.overlap({ gte: 10, lte: 10 }), [
			{ range: { gt: 5, lt: 15 }, key: -1, value: -1 },
			{ range: { gt: 5, lt: 15 }, key: 2, value: 2 },
		])
	})

	it("multiple ranges for a single key", () => {
		const tree = new RangeTree<number, number, number>()

		const items = [
			{ range: { gt: 0, lt: 10 }, key: 1, value: 1 },
			{ range: { gt: 5, lt: 15 }, key: 1, value: 2 },
			{ range: { gt: 10, lt: 20 }, key: 1, value: 3 },
			{ range: { gt: 15, lt: 25 }, key: 2, value: 4 },
			{ range: { gt: 20, lt: 30 }, key: 2, value: 5 },
		]
		for (const item of items) tree.set(item)

		assert.deepEqual(tree.overlap(), items)
		assert.deepEqual(tree.overlap({ gte: 10, lte: 10 }), items.slice(1, 2))

		// Delete a specific range.
		tree.delete({ key: 1, range: { gt: 5, lt: 15 } })
		assert.deepEqual(tree.overlap({ gte: 10, lte: 10 }), [])

		// Delete an entire key.
		tree.delete({ key: 2 })
		assert.deepEqual(tree.overlap(), [items[0], items[2]])
	})
})
