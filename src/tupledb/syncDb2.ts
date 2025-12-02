// Lets assume that publishing is equivalent to writing to the database.

import { tupleTx } from "./TupleDb"
import { JSONValue, Tuple, TupleDb, WriteArgs } from "./types"

function writeSyncDb(db: TupleDb, args: WriteArgs<Tuple, JSONValue>) {
	const clock = db.get(["clock"]) ?? 0
	db.set(["history", clock], args)
	db.set(["clock"], clock + 1)
	db.subspace(["value"]).write(args)
}

export type Pubsub = {
	publish(items: { key: Tuple; value: JSONValue }[]): Promise<void>
}

type ServerApi = {
	write(writes: WriteArgs<Tuple, JSONValue>[]): void
	sync(args: { since: number; writes: WriteArgs<Tuple, JSONValue>[] }): {
		updates: WriteArgs<Tuple, JSONValue>[]
	}
}

function serverApi(db: TupleDb, pubsub: Pubsub): ServerApi {
	return {
		write(writes: WriteArgs<Tuple, JSONValue>[]) {
			const tx = tupleTx(db)
			for (const args of writes) writeSyncDb(db, args)
			tx.commit()
			pubsub.publish([{ key: ["clock"], value: db.get(["clock"]) }])
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

// Full history.
function clientApi(db: TupleDb, api: ServerApi, pubsub: Pubsub) {
	const local = db.subspace(["local"])
	const remote = db.subspace(["remote"])

	async function sync() {
		const start = remote.get(["clock"]) ?? 0
		await api.sync({
			since: start,
			writes: local.list({ gte: ["history", start] }).map(({ value }) => value),
		})
	}

	// return tupleDb({
	// 	compare: db.compare,
	// 	list: db.subspace(["value"]).list,
	// 	write: (args) => {
	// 		// when do we call sync?
	// 	},
	// })
}
