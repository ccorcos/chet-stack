import { randomId } from "../randomId"
import { InMemoryDatabase } from "./InMemoryDatabase"
import { InMemoryIntervalTree } from "./InMemoryIntervalTree"
import { ListArgs, WriteArgs } from "./types"

export class Cache extends InMemoryDatabase<string, string> {
	/** Reactivitiy */
	listeners = new InMemoryIntervalTree<[string, string, string], () => void>()

	subscribe(args: ListArgs<string>, fn: () => void) {
		const start = args.gt ?? args.gte ?? ""
		const end = args.lt ?? args.lte ?? "\xff"
		const id = randomId()
		this.listeners.set([start, end, id], fn)
		return () => this.listeners.delete([start, end, id])
	}

	write(tx: WriteArgs<string, string>) {
		super.write(tx)

		const emits = new Set<() => void>()
		const keys = [...(tx.set?.map(({ key }) => key) ?? []), ...(tx.delete ?? [])]
		for (const key of keys) {
			for (const { value: emit } of this.listeners.intersects(key)) {
				emits.add(emit)
			}
		}

		for (const emit of emits) emit()
	}

	/** Keep track of what is in the cache. */
	ranges = new InMemoryIntervalTree<[string, string, string]>()

	// cached(args: string | ListArgs<string>) {
	// 	if (typeof args === "string") {
	// 		const ranges = this.ranges.intersects(args)
	// 		return ranges.length > 0
	// 	}

	// 	// TODO: include limit and reverse.
	// 	// TODO: this could be optimized

	// 	const ranges = this.ranges.overlaps(args)
	// 	if (ranges.length === 0) return false

	// 	let [start, end] = ranges[0].key
	// 	if (this.boundsCover(args, [start, end])) return true

	// 	for (const range of ranges.slice(1)) {
	// 		const [startI, endI] = range.key
	// 		if (this.compareBound(startI, start) < 0) start = startI
	// 		if (this.compareBound(endI, end) > 0) end = endI
	// 		if (this.boundsCover(args, [start, end])) return true
	// 	}

	// 	return false
	// }
}
