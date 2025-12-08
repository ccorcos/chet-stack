import { InMemoryOkv } from "./InMemoryOkv"
import { ListArgs, Okv, WriteArgs } from "./types"

export class QueryCache<K, V> implements Okv<K, V> {
	data: InMemoryOkv<K, V>
	reads: ListArgs<K>[] = []

	constructor(public db: Okv<K, V>) {
		this.data = new InMemoryOkv<K, V>(this.db.compare)
	}

	compare = (a: K, b: K) => this.db.compare(a, b)

	list = (args: ListArgs<K> = {}): { key: K; value: V }[] => {
		this.reads.push(args)
		const data = this.db.list(args)
		this.data.write({ set: data })
		return data
	}

	write = (args: WriteArgs<K, V>) => {
		throw new Error("Not implemented")
	}
}
