import { describe, it } from "mocha"
import { strict as assert } from "node:assert"
import { y } from "./syncAsync"

type W = <T>(x: T) => Generator<any, T, any>

const s: W = <T>(x: T) => y(x)
const a: W = <T>(x: T) => y(Promise.resolve(x))

// c
function* n(w: W, ...values: any[]) {
	for (const value of values) yield* w(value)
}

// Some hand rolled examples.
const tests = [
	function* serial(w: W) {
		return [yield* w(1), yield* w(2), yield* w(3), yield* w(4), yield* w(5)]
	},
	function* parallel(w: W) {
		return yield* y.all([w(1), w(2), w(3), w(4), w(5)])
	},
	function* serialFirst(w: W) {
		return [yield* w(1), ...(yield* y.all([w(2), w(3), w(4), w(5)]))]
	},
	function* allFirst(w: W) {
		return [...(yield* y.all([w(1), w(2), w(3), w(4)])), yield* w(5)]
	},
	function* mixed1(w: W) {
		return [...(yield* y.all([w(1), w(2)])), yield* w(3), ...(yield* y.all([w(4), w(5)]))]
	},
	function* mixed2(w: W) {
		return [yield* w(1), ...(yield* y.all([w(2), w(3)])), yield* w(4), ...(yield* y.all([w(5)]))]
	},
	function* nested(w: W) {
		return [yield* w(1), ...(yield* y.all([w(2), w(3)])), yield* w(4), ...(yield* y.all([w(5)]))]
	},
]

describe("syncAsync", () => {
	for (let i = 0; i < tests.length; i++) {
		it(`test ${i} sync`, () => {
			assert.deepEqual(y.run(tests[i](s)), [1, 2, 3, 4, 5])
		})
		it(`test ${i} async`, async () => {
			assert.deepEqual(await y.run(tests[i](a)), [1, 2, 3, 4, 5])
		})
	}
})

// ============================================================================
// Explore property testing.
// ============================================================================

// [start, end) -> [start, start+1, ..., end-1]
function range(start: number, end: number): number[] {
	const result: number[] = []
	for (let i = start; i < end; i++) {
		result.push(i)
	}
	return result
}

type NumberTree = (number | NumberTree)[]

/**
 * Generate all NumberTrees over the contiguous range [start, end),
 * where:
 * - leaves are numbers
 * - arrays (NumberTrees) have length >= 2 everywhere
 *   except the trivial case of a single-item tree (end === start+1).
 */
function* permute(start: number, end: number): Generator<NumberTree, void, unknown> {
	const length = end - start
	if (length <= 0) {
		return
	}

	// Trivial single-item tree: [start]
	if (length === 1) {
		yield [start]
		return
	}

	// Build one tree as a list of children (numbers or subtrees).
	// `pos` is where we're currently at in [start, end).
	function* build(
		pos: number,
		isFirst: boolean
	): Generator<(number | NumberTree)[], void, unknown> {
		if (pos === end) {
			yield []
			return
		}

		for (let blockEnd = pos + 1; blockEnd <= end; blockEnd++) {
			// If this is the first child and it covers the entire range,
			// we'd get an array with a single element. We forbid that
			// to enforce "arrays have length >= 2" for length >= 2 ranges.
			if (isFirst && blockEnd === end) {
				continue
			}

			const blockLen = blockEnd - pos

			// Options for the first child:
			// - If the block is length 1, it's just a leaf number.
			// - If the block is length >= 2, it can be any subtree
			//   over that subrange.
			const firstOptions: (number | NumberTree)[] =
				blockLen === 1 ? [pos] : Array.from(permute(pos, blockEnd))

			for (const first of firstOptions) {
				if (blockEnd === end) {
					// This is the last child.
					yield [first]
				} else {
					// There is more to the right; recurse.
					for (const tail of build(blockEnd, false)) {
						yield [first, ...tail]
					}
				}
			}
		}
	}

	for (const children of build(start, true)) {
		// For length >= 2, enforce that arrays have >= 2 items.
		// (For length === 1 we already returned above.)
		if (children.length >= 2) {
			yield children
		}
	}
}

describe("permute", () => {
	it("1", () => {
		assert.deepEqual(Array.from(permute(0, 1)), [[0]])
	})

	it("2", () => {
		console.log(Array.from(permute(0, 2)))

		assert.deepEqual(Array.from(permute(0, 2)), [[0, 1], [[0, 1]]])
	})
	it("3", () => {
		console.log(Array.from(permute(0, 3)))

		// assert.deepEqual(Array.from(permute(0, 3)), [[0, 1, 2], [0, [1, 2]], [[0, 1], 2], [[0, 1, 2]]])
	})
	it("4", () => {
		console.log(Array.from(permute(0, 4)))
		// assert.deepEqual(Array.from(permute(0, 4)), [
		// 	[0, 1, 2, 3],
		// 	[0, 1, [2, 3]],
		// 	[0, [1, 2], 3],
		// 	[0, [1, 2, 3]],
		// 	[0, 1, 2, 3],
		// 	[0, 1, [2, 3]],
		// 	[[0, 1], 2, 3],
		// 	[
		// 		[0, 1],
		// 		[2, 3],
		// 	],
		// 	[0, 1, 2, 3],
		// 	[0, [1, 2], 3],
		// 	[[0, 1], 2, 3],
		// 	[[0, 1, 2], 3],
		// ])
	})
	it("5", () => {
		console.log(Array.from(permute(0, 5)))
		// assert.deepEqual(Array.from(permute(0, 5)), [
		// 	[0, 1, 2, 3, 4],
		// 	[0, 1, 2, [3, 4]],
		// 	[0, 1, [2, 3], 4],
		// 	[0, 1, [2, 3, 4]],
		// 	[0, 1, 2, 3, 4],
		// 	[0, 1, 2, [3, 4]],
		// 	[0, [1, 2], 3, 4],
		// 	[0, [1, 2], [3, 4]],
		// 	[0, 1, 2, 3, 4],
		// 	[0, 1, [2, 3], 4],
		// 	[0, [1, 2], 3, 4],
		// 	[0, [1, 2, 3], 4],
		// 	[0, 1, 2, 3, 4],
		// 	[0, 1, 2, [3, 4]],
		// 	[0, 1, [2, 3], 4],
		// 	[0, 1, [2, 3, 4]],
		// 	[[0, 1], 2, 3, 4],
		// 	[[0, 1], 2, [3, 4]],
		// 	[[0, 1], [2, 3], 4],
		// 	[
		// 		[0, 1],
		// 		[2, 3, 4],
		// 	],
		// 	[0, 1, 2, 3, 4],
		// 	[0, 1, 2, [3, 4]],
		// 	[0, [1, 2], 3, 4],
		// 	[0, [1, 2], [3, 4]],
		// 	[[0, 1], 2, 3, 4],
		// 	[[0, 1], 2, [3, 4]],
		// 	[[0, 1, 2], 3, 4],
		// 	[
		// 		[0, 1, 2],
		// 		[3, 4],
		// 	],
		// 	[0, 1, 2, 3, 4],
		// 	[0, 1, [2, 3], 4],
		// 	[0, [1, 2], 3, 4],
		// 	[0, [1, 2, 3], 4],
		// 	[0, 1, 2, 3, 4],
		// 	[0, 1, [2, 3], 4],
		// 	[[0, 1], 2, 3, 4],
		// 	[[0, 1], [2, 3], 4],
		// 	[0, 1, 2, 3, 4],
		// 	[0, [1, 2], 3, 4],
		// 	[[0, 1], 2, 3, 4],
		// 	[[0, 1, 2], 3, 4],
		// ])
	})
})
