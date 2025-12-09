import { ListArgs, Okv, TupleOkv, WriteArgs } from "./types"

export class ReadCache<K, V> implements Okv<K, V> {
	reads: {
		args: ListArgs<K>
		results: { key: K; value: V }[]
	}[] = []

	constructor(public db: Okv<K, V>) {}

	compare = (a: K, b: K) => this.db.compare(a, b)

	list = (args: ListArgs<K> = {}): { key: K; value: V }[] => {
		const results = this.db.list(args)
		this.reads.push({ args, results })
		return results
	}

	write = (args: WriteArgs<K, V>) => {
		throw new Error("Not implemented")
	}
}

function tupleRead(db: TupleOkv) {}
