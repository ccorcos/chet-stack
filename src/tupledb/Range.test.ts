import { describe, it } from "mocha"
import { strict as assert } from "node:assert"
import { Range, compareRange, overlapsRange } from "./Range"

describe("range", () => {
	it("overlaps", () => {
		const yes = (a: Range<string>, b: Range<string>, message?: string) => {
			assert.ok(overlapsRange(a, b), message ?? JSON.stringify({ a, b }))
			assert.ok(overlapsRange(b, a), message ?? JSON.stringify({ a, b }))
		}

		const no = (a: Range<string>, b: Range<string>, message?: string) => {
			assert.ok(!overlapsRange(a, b), message ?? JSON.stringify({ a, b }))
			assert.ok(!overlapsRange(b, a), message ?? JSON.stringify({ a, b }))
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

	it("compareRange", () => {
		const lt = (a: Range<string>, b: Range<string>) => {
			const as = JSON.stringify(a)
			const bs = JSON.stringify(b)
			assert.equal(compareRange(a, b), -1, `${as} < ${bs}`)
			assert.equal(compareRange(b, a), 1, `${bs} > ${as}`)
			assert.equal(compareRange(a, a), 0, `${as} = ${as}`)
			assert.equal(compareRange(b, b), 0, `${bs} = ${bs}`)
		}

		const gt = (a: Range<string>, b: Range<string>) => lt(b, a)

		// Empty ranges
		lt({}, { gt: "3" })
		lt({}, { gte: "3" })
		gt({}, { lt: "7" })
		gt({}, { lte: "7" })
		lt({}, { gt: "3", lt: "7" })
		lt({}, { gt: "3", lte: "7" })
		lt({}, { gte: "3", lt: "7" })
		lt({}, { gte: "3", lte: "7" })

		// Left overlap
		lt({ lt: "4" }, { gt: "3" })
		lt({ lt: "4" }, { gte: "3" })
		lt({ lte: "4" }, { gt: "3" })
		lt({ lte: "4" }, { gte: "3" })

		// Left boundary case
		lt({ lte: "3" }, { gte: "3" })
		lt({ lt: "3" }, { gte: "3" })
		lt({ lte: "3" }, { gt: "3" })
		lt({ lt: "3" }, { gt: "3" })

		// Right overlap
		gt({ gt: "3" }, { lt: "4" })
		gt({ gt: "3" }, { lte: "4" })
		gt({ gte: "3" }, { lt: "4" })
		gt({ gte: "3" }, { lte: "4" })

		// Right boundary case
		gt({ gte: "3" }, { lte: "3" })
		gt({ gt: "3" }, { lt: "3" })
		gt({ gt: "3" }, { lte: "2" })
		gt({ gt: "3" }, { lt: "2" })

		// Boundaries
		lt({ gte: "3" }, { gt: "3" })
		gt({ lte: "3" }, { lt: "3" })

		// Inside/outside
		lt({ gt: "3", lt: "7" }, { gt: "4", lt: "6" })
		gt({ gt: "3", lt: "7" }, { gt: "1", lt: "2" })

		// AI below this comment.
		// Overlapping ranges
		lt({ gt: "1", lt: "5" }, { gt: "3", lt: "7" })

		// Adjacent ranges
		lt({ lte: "5" }, { gte: "5" })

		// Test non-overlapping cases
		lt({ lt: "5" }, { gt: "5" })

		// Contained ranges
		lt({ gt: "2", lt: "8" }, { gt: "4", lt: "6" })
		gt({ gt: "4", lt: "6" }, { gt: "2", lt: "8" })

		// Disjoint ranges
		lt({ lt: "2" }, { gt: "5" })
		gt({ gt: "5" }, { lt: "2" })

		// Mixed inclusive/exclusive bounds
		gt({ gte: "5" }, { lte: "5" })
		lt({ gt: "2", lte: "5" }, { gte: "5", lt: "8" })
		lt({ gt: "2", lt: "5" }, { gt: "5", lt: "8" })

		// One-sided ranges
		gt({ gt: "5" }, { lt: "8" })
		gt({ gte: "5" }, {})
		gt({}, { lte: "5" })
	})
})
