/*

Sync a number.
- logical clock for causality.
- central server authority on transaction ordering.

TODO:
- idempotency of writes
- concurrent calls to sync
- ignore history whenver possible.

*/

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
	history: Record<number, Tx<O>>
	apply: (tx: Tx<O>) => void
}

export function syncState<V, O>(crdt: Crdt<V, O>): SyncState<V, O> {
	return {
		clock: 0,
		value: crdt.initial,
		history: {},
		apply(tx: Tx<O>) {
			this.history[this.clock] = tx
			this.value = crdt.apply(this.value, tx.ops)
			this.clock += 1
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
		}): Promise<
			| { clock: number; updates: Record<number, Tx<O>>; value?: undefined }
			| { clock: number; value: V; updates?: undefined }
		> {
			const { since, write: txs } = args

			await this.write({ txs })

			const behind = this.state.clock - since - txs.length

			// Client is behind by a little bit, send history updates.
			if (behind <= maxBehind) {
				const updates: Record<number, Tx<O>> = {}
				for (let i = since; i < this.state.clock; i++) updates[i] = this.state.history[i]
				return { clock: this.state.clock, updates }
			}

			// Client is behind by a lot, just send the current value.
			return { clock: this.state.clock, value: this.state.value }
		},
	}
}

// const server = serverSync(syncState(numberCrdt))

function client<V, O>(crdt: Crdt<V, O>, server: ReturnType<typeof serverSync<V, O>>) {
	return {
		remote: syncState(crdt),
		local: syncState(crdt),

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
				while (this.remote.clock < response.clock) {
					this.remote.apply(response.updates[this.remote.clock])
				}
			} else {
				this.remote.clock = response.clock
				this.remote.history = []
				this.remote.value = response.value
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

// Think about...
// - pubsub for the clock -> call client.sync()
// - how does this work for chat messages
// - how does this work for y.map, y.array, and okv

/*

I'd like to use my minimal counter example and create 4 different extensions
1. counter sync model so it can work p2p with lamport clocks
2. a map instead of a number, similar to y.Map
3. a list/array instead of a number, similar to y.Array
4. a chat room instead of a number, where messages can be edited and deleted, but they're displayed in clock order.

*/
