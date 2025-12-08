// Lets assume that publishing is equivalent to writing to the database.

import { Cache } from "./Cache"
import { codec } from "./Codec"
import { tupleTx } from "./TupleDb"
import { JSONValue, ListArgs, Tuple, TupleDb, WriteArgs } from "./types"

function writeSync(db: TupleDb, args: WriteArgs<Tuple, JSONValue>) {
	const clock = db.get(["clock"]) ?? 0
	db.set(["history", clock], args)
	db.set(["clock"], clock + 1)
	db.subspace(["value"]).write(args)
}

// TODO: idempotency, failure handling, transaction id.
function syncServer(db: TupleDb, pubsub: Pubsub): ServerApi {
	return {
		write(writes: WriteArgs<Tuple, JSONValue>[]) {
			const tx = tupleTx(db)
			for (const args of writes) writeSync(db, args)
			tx.commit()
			pubsub.publish([{ key: ["clock"], value: db.get(["clock"]) }])
		},
		sync(args) {
			const { since } = args
			const updates: any[] = db.list({ gte: ["history", since] })
			return { updates }
		},
		list(args: ListArgs<Tuple>) {
			const tx = tupleTx(db)
			tx.get(["clock"])
			tx.subspace(["value"]).list(args)

			tx
			return { results, clock }
		},
	}
}

export type Pubsub = {
	publish(items: { key: Tuple; value: JSONValue }[]): Promise<void>
}

type ServerApi = {
	write(args: WriteArgs<Tuple, JSONValue>[]): void
	list(args: ListArgs<Tuple>): { key: Tuple; value: JSONValue }[]
	sync(args: { since: number }): {
		updates: { key: ["history", number]; value: WriteArgs<Tuple, JSONValue> }[]
	}
}

// Full history.
function syncClient(api: ServerApi, pubsub: Pubsub) {
	const cache = new Cache<Tuple, JSONValue>(codec.compare)

	return {
		list(args: ListArgs<Tuple>) {
			return cache.list(args)
		},
	}
}
