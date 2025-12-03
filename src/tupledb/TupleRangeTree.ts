import { Compare } from "shared/compare"
import { decodeRange, encodeRange, overlapsRange, Range } from "./Range"
import { tupleDb, tupleOkv, tupleTx } from "./TupleDb"
import { TupleOkv } from "./types"

/**
 * This assumes all boundaries can be compared in a tupleDb.
 *
 * Ideas for later...
 * - can we make `overlaps` more efficient with a proper interval tree?
 */
export class TupleRangeTree<B, K, V> {
	public db: TupleOkv

	constructor(db?: TupleOkv) {
		if (!db) this.db = tupleOkv()
		else this.db = db
	}

	set = (args: { range: Range<B>; key: K; value: V }) => {
		const { range, key, value } = args
		const tx = tupleTx(this.db)
		tx.subspace(["ranges"]).set([encodeRange(range), key], value)
		tx.subspace(["keys"]).set([key, encodeRange(range)], value)
		tx.commit()
	}

	delete = (args: { key: K; range?: Range<B> }) => {
		let { key, range } = args

		// Delete all ranges.
		if (range === undefined) {
			const tx = tupleTx(this.db)
			const results = tx.subspace(["keys"]).list({ gte: [key], lte: [key, null] })
			for (const item of results) {
				const [key, range] = item.key
				tx.subspace(["ranges"]).delete([range, key])
			}
			tx.commit()
			return
		}

		// Delete just a single range.
		const tx = tupleTx(this.db)
		tx.subspace(["ranges"]).delete([encodeRange(range), key])
		tx.subspace(["keys"]).delete([key, encodeRange(range)])
		tx.commit()
	}

	overlap = (range: Range<B> = {}) => {
		const result: { range: Range<B>; key: K; value: V }[] = []
		for (const { key, value } of tupleDb(this.db).subspace(["ranges"]).list()) {
			const itemRange = decodeRange(key[0]) as Range<B>
			if (overlapsRange(itemRange, range, this.db.compare as Compare<B>)) {
				result.push({ range: itemRange, key: key[1], value })
			}
		}
		return result
	}
}
