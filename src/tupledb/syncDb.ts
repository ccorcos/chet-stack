import { KeyEncodeList, TupleSubspaceEncoder } from "./Encoder"
import { InMemoryOkv } from "./InMemoryOkv"
import { tupleDb, tupleTx } from "./TupleDb"
import { JSONValue, Okv, Tuple, TupleDb, TupleTx, WriteArgs } from "./types"

type Pubsub<K = any, V = any> = {
	publish(items: { key: K; value: V }[]): void
}

type TupleOkv = Okv<Tuple, JSONValue>
type TuplePubsub = Pubsub<Tuple, JSONValue>

type SyncOkv = TupleOkv & TuplePubsub

type SyncDb = Omit<TupleDb, "subspace"> & TuplePubsub & { subspace: (prefix: Tuple) => SyncDb }

type SyncTx = Omit<TupleTx, "subspace"> & TuplePubsub & { subspace: (prefix: Tuple) => SyncDb }

function syncOkv(db: TupleOkv, pubsub: TuplePubsub): SyncOkv {
	return { ...db, ...pubsub }
}

function syncDb(db: SyncOkv): SyncDb {
	const tdb = tupleDb(db)
	return {
		...db,
		...tdb,
		subspace(prefix: Tuple) {
			const encoder = TupleSubspaceEncoder(prefix)
			return syncDb({
				...tdb.subspace(prefix),
				publish: (items) => db.publish(KeyEncodeList(items, encoder)),
			})
		},
	}
}

function syncTx(db: SyncOkv): SyncTx {
	const tx = tupleTx(db)

	const pubs = new InMemoryOkv(db.compare)

	return {
		...syncDb({ ...tx, publish: (args) => pubs.write({ set: args }) }),
		commit: () => {
			tx.commit()
			db.publish(pubs.list())
		},
		get committed() {
			return tx.committed
		},
	}
}

function writeSyncDb(db: TupleDb, args: WriteArgs<Tuple, JSONValue>) {
	const clock = db.get(["clock"]) ?? 0
	db.set(["history", clock], args)
	db.set(["clock"], clock + 1)
	db.subspace(["value"]).write(args)
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
