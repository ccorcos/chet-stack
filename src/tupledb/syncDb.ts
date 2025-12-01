import { Range } from "./Range"
import { tupleDb, tupleTx } from "./TupleDb"
import { JSONValue, Okv, Tuple, TupleDb, TupleTx, WriteArgs } from "./types"


function writeSyncDb(db: TupleDb, args: WriteArgs<Tuple, JSONValue>) {
	const clock = db.get(["clock"]) ?? 0
	db.set(["history", clock], args)
	db.set(["clock"], clock + 1)
	db.subspace(["value"]).write(args)
}


// This part is super simple, doesnt work create with teh publish side-effect though.
function serverSyncDb(db: TupleDb, pubsub: Pubsub) {
	return tupleDb({
		compare: db.compare,
		list(args) {
			return db.subspace(["value"]).list(args)
		},
		write(args) {
			const clock = db.get(["clock"]) ?? 0
			db.set(["history", clock], args)
			db.set(["clock"], clock + 1)
			db.subspace(["value"]).write(args)
			pubsub.publish(["clock"], clock + 1)
		},
	})
}


function serverApi(db: TupleDb, pubsub: Pubsub) {
	return {
		write(writes: WriteArgs<Tuple, JSONValue>[]) {
			const tx = tupleTx(db)
			for (const args of writes) writeSyncDb(db, args)
			tx.commit()
			pubsub.publish(["clock"], db.get(["clock"]))
		},
		sync(args: { since: number; writes: WriteArgs<Tuple, JSONValue>[] }): {
			updates: WriteArgs<Tuple, JSONValue>[]
		} {
			const { since, writes } = args
			this.write(writes)
			const updates = db.list({ gte: ["history", since] }).map(({ value }) => value)
			return { updates }
		},
	}
}

type TupleOkv = Okv<Tuple, JSONValue>

type Pubsub<K=any, V=any> = {
	publish(items: { key: K; value: V }[]): void
	subscribe(range: Range<K>): () => void
	onMessage(fn: (items: { key: K; value: V }[]) => void): () => void
}

type TuplePubsub = Pubsub<Tuple, JSONValue>

type SyncOkv = TupleOkv & TuplePubsub

type SyncDb = Omit<TupleDb, "subspace"> & TuplePubsub & { subspace: (prefix: Tuple) => SyncDb }

type SyncTx = Omit<TupleTx, "subspace"> {
	// wait til commit to publish.
}

// Thinking aloud...
// - pubsub subspace...
// - publishing in a transaction should be deferred until commit.
// -


function clientSyncDb(server: TupleDb) {
	// ["clock"]: number
	// ["value"]: TupleDb
	// ["history", number]: Tx

	const local: TupleDb = {} as any
	const remote: TupleDb = {} as any

	return {}
}

/*

The main process...

client fetches a range and subscribes to a range.
the server emits specific ranges.




*/
