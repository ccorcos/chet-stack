import { randomId } from "../randomId"
import { InMemoryDatabase } from "./InMemoryDatabase"
import { InMemoryIntervalTree } from "./InMemoryIntervalTree"
import { ListArgs, WriteArgs } from "./types"

export class ReactiveDatabase extends InMemoryDatabase<string, string> {
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
}
