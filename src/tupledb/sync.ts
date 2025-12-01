/*

Sync a number.
- logical clock for causality.
- central server authority on transaction ordering.

TODO:
- idempotency of writes
- concurrent calls to sync
- ignore history whenver possible.

*/

import { codec } from "./Codec"
import { InMemoryOkv } from "./InMemoryOkv"
import { tupleDb } from "./TupleDb"
import { TupleDb } from "./types"

type Tx<O> = {
	id: string
	ops: O[]
}

type Crdt<V, O> = {
	initial: V
	apply: (value: V, ops: O[]) => V
}

const numberCrdt: Crdt<number, { type: "set" | "increment"; value: number }> = {
	initial: 0,
	apply: (value, ops) => {
		for (const op of ops) {
			if (op.type === "set") {
				value = op.value
			} else if (op.type === "increment") {
				value += op.value
			}
		}
		return value
	},
}

type SyncState<V, O> = {
	clock: number
	value: V
	history: (since: number) => Tx<O>[]
	reset: (args: { clock: number; value: V }) => void
	apply: (tx: Tx<O>) => void
}

export function syncState<V, O>(crdt: Crdt<V, O>, db: TupleDb): SyncState<V, O> {
	return {
		get clock(): number {
			return db.get(["clock"]) ?? 0
		},
		set clock(value: number) {
			db.set(["clock"], value)
		},
		get value(): V {
			return db.get(["value"]) ?? crdt.initial
		},
		set value(value: V) {
			db.set(["value"], value)
		},
		history(since: number): Tx<O>[] {
			return db.list({ gte: ["history", since] }).map(({ value }) => value as Tx<O>)
		},
		reset(args: { clock: number; value: V }) {
			this.clock = args.clock
			this.value = args.value
			for (const { key } of db.subspace(["history"]).list()) db.delete(key)
		},
		apply(tx: Tx<O>) {
			db.set(["history", this.clock], tx)
			this.clock += 1
			this.value = crdt.apply(this.value, tx.ops)
		},
	}
}

function serverSync<V, O>(state: SyncState<V, O>, maxBehind: number = 5) {
	return {
		state: state,

		// API
		async write(args: { txs: Tx<O>[] }): Promise<void> {
			for (const tx of args.txs) this.state.apply(tx)
		},

		async sync(args: {
			since: number
			write: Tx<O>[]
		}): Promise<{ updates: Tx<O>[] } | { updates?: undefined; clock: number; value: V }> {
			const { since, write: txs } = args

			await this.write({ txs })

			const behind = this.state.clock - since - txs.length

			// Client is behind by a little bit, send history updates.
			if (behind <= maxBehind) {
				const updates = this.state.history(since)
				return { updates }
			}

			// Client is behind by a lot, just send the current value.
			return { clock: this.state.clock, value: this.state.value }
		},
	}
}

function InMemoryTupleDb() {
	return tupleDb(new InMemoryOkv(codec.compare))
}

// const server = serverSync(syncState(numberCrdt))

function client<V, O>(crdt: Crdt<V, O>, server: ReturnType<typeof serverSync<V, O>>) {
	return {
		remote: syncState(crdt, InMemoryTupleDb()),
		local: syncState(crdt, InMemoryTupleDb()),

		get value() {
			return this.local.value
		},

		apply(tx: Tx<O>) {
			this.local.apply(tx)
			this.sync()
		},

		async sync() {
			const start = this.remote.clock
			const end = this.local.clock

			const pending: Tx<O>[] = []
			for (let i = start; i < end; i++) pending.push(this.local.history[i])

			const response = await server.sync({
				since: start,
				write: pending,
			})

			if (response.updates) {
				for (const tx of response.updates) this.remote.apply(tx)
			} else {
				this.remote.reset({ clock: response.clock, value: response.value })
			}

			// Remaining writes on top.
			const remaining: Tx<O>[] = []
			for (let i = end; i < this.local.clock; i++) remaining.push(this.local.history[i])

			this.local.clock = this.remote.clock
			this.local.value = this.remote.value
			this.local.history = this.remote.history
			for (const tx of remaining) this.local.apply(tx)
		},
	}
}
