import { describe, it } from "mocha"
import { strict as assert } from "node:assert"
import { y } from "./syncAsync"

type W = <T>(x: T) => Generator<any, T, any>

const s: W = <T>(x: T) => y(x)
const a: W = <T>(x: T) => y(Promise.resolve(x))

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
