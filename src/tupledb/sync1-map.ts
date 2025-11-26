/*

Sync a map.
- logical clock for causality.
- central server authority on transaction ordering, last-write-wins

Problems that we will ignore for now:
- idempotency of writes
- concurrent calls to sync

Benefits:
- we can ignore history before the last sync.

*/

type Op = { type: "set"; key: string; value: any } | { type: "delete"; key: string }

export function map() {
	return {
		clock: 0,
		value: new Map<string, any>(),
		history: [] as Op[],

		set(key: string, value: any) {
			const clock = this.clock
			this.history[clock] = { type: "set", key, value }
			this.value.set(key, value)
			this.clock += 1
		},

		delete(key: string) {
			const clock = this.clock
			this.history[clock] = { type: "delete", key }
			this.value.delete(key)
			this.clock += 1
		},

		write(ops: Op[]) {
			const start = this.clock
			for (const op of ops) {
				if (op.type === "set") {
					this.set(op.key, op.value)
				} else if (op.type === "delete") {
					this.delete(op.key)
				}
			}
			return start
		},
	}
}

const server = {
	map: map(),
	sync(clock: number, ops: Op[]) {
		this.map.write(ops)
		return this.map.history.slice(clock)
	},
}

function client() {
	return {
		remote: map(),
		local: map(),

		set(key: string, value: any) {
			this.local.set(key, value)
			this.sync()
		},

		delete(key: string) {
			this.local.delete(key)
			this.sync()
		},

		async sync() {
			const start = this.remote.clock
			const end = this.local.clock

			const pending: Op[] = []
			for (let i = start; i < end; i++) pending.push(this.local.history[i])

			const history = await server.sync(start, pending)
			this.remote.write(history)

			// Remaining writes on top.
			const rest: Op[] = []
			for (let i = end; i < this.local.clock; i++) rest.push(this.local.history[i])

			this.local.clock = this.remote.clock
			this.local.value = new Map(this.remote.value)
			this.local.history = [...this.remote.history]
			this.local.write(rest)
		},
	}
}

// Think about...
// - pubsub for the clock -> call client.sync()
// - how does this work for chat messages
// - how does this work for y.array and okv
// - conflict resolution for concurrent writes to the same key
