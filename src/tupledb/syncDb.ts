import { KeyEncodeList, TupleSubspaceEncoder } from "./Encoder"
import { subspace, tupleDb, tupleTx } from "./TupleDb"
import { JSONValue, Okv, Tuple, TupleDb, TupleTx, WriteArgs } from "./types"

type Pubsub<K = any, V = any> = {
	publish(items: { key: K; value: V }[]): void
}

type TupleOkv = Okv<Tuple, JSONValue>
type TuplePubsub = Pubsub<Tuple, JSONValue>

type SyncOkv = TupleOkv & TuplePubsub

type SyncDb = Omit<TupleDb, "subspace"> &
	TuplePubsub & {
		subspace: (prefix: Tuple) => SyncDb
		emit: (key: Tuple, value: JSONValue) => void
	}

type SyncTx = Omit<TupleTx, "subspace"> & SyncDb

// Lets now imagine that publishing involve writing to the db... and we pull it out elsewhere.

function syncOkv(db: TupleOkv): SyncOkv {
	return {
		...subspace(db, ["data"]),
		publish: (items) => subspace(db, ["pubsub"]).write({ set: items }),
	}
}

// function syncOkv(db: TupleOkv, pubsub: TuplePubsub): SyncOkv {
// 	return { ...db, ...pubsub }
// }

function syncDb(db: SyncOkv): SyncDb {
	const tdb = tupleDb(db)
	return {
		...tdb,
		publish: db.publish,
		emit: (key, value) => db.publish([{ key, value }]),
		subspace(prefix) {
			const encoder = TupleSubspaceEncoder(prefix)
			return syncDb({
				...tdb.subspace(prefix),
				publish: (items) => db.publish(KeyEncodeList(items, encoder)),
			})
		},
	}
}

const pubs: any = {}
function syncTx(db: SyncOkv): SyncTx {
	const tx = tupleTx({
		compare: db.compare,
		list: db.list,
		write: (args) => {
			// get data
			// get pubsub
		},
	})

	return {
		...syncDb({
			compare: tx.compare,
			list: tx.subspace(["data"]).list,
			write: tx.subspace(["data"]).write,
			publish: (items) => tx.subspace(["pubsub"]).write({ set: items }),
		}),
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

function serverApi(db: TupleDb, pubsub: any) {
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
