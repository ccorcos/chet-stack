// Lets assume that publishing is equivalent to writing to the database.

import { isEqual } from "lodash-es"
import { Cache } from "./Cache"
import { ReadCache } from "./ReadCache"
import { tupleDb, tupleTx } from "./TupleDb"
import { JSONValue, ListArgs, Tuple, TupleDb, WriteArgs } from "./types"

function writeSync(db: TupleDb, args: WriteArgs<Tuple, JSONValue>) {
	const clock = db.get(["clock"]) ?? 0
	db.set(["history", clock], args)
	db.set(["clock"], clock + 1)
	db.write(args)
}

type ServerApi = {
	write(args: WriteArgs<["value", ...Tuple], JSONValue>[]): void
	list(
		args: ListArgs<Tuple>
	): { args: ListArgs<Tuple>; results: { key: Tuple; value: JSONValue }[] }[]
}

// TODO: idempotency, failure handling, transaction id.
function syncServer(db: TupleDb, pubsub: Pubsub): ServerApi {
	return {
		// Batch writes.
		write(writes: WriteArgs<["value", ...Tuple], JSONValue>[]) {
			// TODO: don't let the user write to any subspace other than value.
			const tx = tupleTx(db)
			for (const args of writes) writeSync(db, args)
			tx.commit()
			pubsub.publish([{ key: ["clock"], value: db.get(["clock"]) }])
		},
		// List always returns clock with read ranges, etc.
		list(args: ListArgs<Tuple>) {
			const cache = new ReadCache(db)
			const tx = tupleDb(cache)

			tx.get(["clock"])
			tx.list(args)

			return cache.reads
		},
	}
}

type Pubsub = {
	publish(items: { key: Tuple; value: JSONValue }[]): Promise<void>
	subscribe(key: Tuple): void
	unsubscribe(key: Tuple): void
	onMessage(listener: (key: Tuple, value: JSONValue) => void): () => void
}

// Full history.
function syncClient(api: ServerApi, pubsub: Pubsub, cache: Cache<Tuple, JSONValue>) {
	pubsub.subscribe(["clock"])
	pubsub.onMessage((key, value) => {
		if (isEqual(key, ["clock"])) {
			// cache.insert(key, value)
		}
	})

	return {
		destroy() {
			pubsub.unsubscribe(["clock"])
		},
		list(args: ListArgs<Tuple>) {
			const result = cache.list(args)
			if (!result.hit) {
				// TODO: need to overfetch similar to how Transaction.list does it.
				Promise.resolve(api.list(args)).then((response) => {
					// if (response.status !== 200) throw new Error("Request failed: " + response.status)
					cache.insert(args, response)
				})
			}
			return result
		},
		write(args: WriteArgs<["value", ...Tuple], JSONValue>) {
			api.write(args)
		},
	}
}
