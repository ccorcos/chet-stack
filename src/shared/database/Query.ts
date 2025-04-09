import { ValidationError } from "../errors"
import { InMemoryBaseOKV } from "./InMemoryBaseOKV"
import { okv } from "./OKV"
import { Range } from "./Range"
import { BaseOKV, ListArgs, OKV, WriteArgs } from "./types"

export class Transaction<K, V> implements BaseOKV<K, V> {
	data: InMemoryBaseOKV<K, V>
	reads: Range<K>[] = []
	// writes: WriteArgs<K, V> = { set: [], delete: [] }

	constructor(public db: BaseOKV<K, V>) {
		this.data = new InMemoryBaseOKV<K, V>(this.db.compare)
	}

	compare = (a: K, b: K) => this.db.compare(a, b)

	list(args: ListArgs<K> = {}): { key: K; value: V }[] {
		this.reads.push(args)
		const data = this.db.list(args)
		this.data.write({ set: data })
		return data
	}

	write(args: WriteArgs<K, V>) {
		throw new Error("Not implemented")
		// this.writes = {
		// 	set: [...this.writes.set!, ...(args.set ?? [])],
		// 	delete: [...this.writes.delete!, ...(args.delete ?? [])],
		// }
	}

	commit = () => {
		throw new Error("Not implemented")
		// this.db.write(this.writes)
	}
}

type Query = <V>(db: OKV<string, V>) => any

export function query<V>(db: BaseOKV<string, V>, query: string) {
	const tx = new Transaction(db)

	const context = {
		console: { log: (msg: string) => console.log("[Sandbox]", msg) },
	}

	let result: any
	try {
		const fn = new Function(
			...Object.keys(context),
			`return (function() { return ${query.trim()} })();`
		)(...Object.values(context))

		result = fn(okv(tx))
	} catch (err) {
		console.error("Sandbox error:", err)
		throw new ValidationError("Sandbox error")
	}

	const data = tx.data.data
	const ranges = tx.reads

	return { data, ranges, result }
}
