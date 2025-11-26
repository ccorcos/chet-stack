/*

Sync a number.
- logical clock for causality.
- central server authority on transaction ordering, last-write-wins

Problems that we will ignore for now:
- idempotency of writes
- concurrent calls to sync

Benefits:
- we can ignore history before the last sync.

*/

type Op = { type: "set" | "increment"; value: number }

export function counter() {
	return {
		clock: 0,
		value: 0,
		history: [] as Op[],

		set(value: number) {
			const clock = this.clock
			this.history[clock] = { type: "set", value }
			this.value = value
			this.clock += 1
		},

		increment(value: number) {
			const clock = this.clock
			this.history[clock] = { type: "increment", value }
			this.value += value
			this.clock += 1
		},

		write(ops: Op[]) {
			const start = this.clock
			for (const op of ops) {
				if (op.type === "set") {
					this.set(op.value)
				} else if (op.type === "increment") {
					this.increment(op.value)
				}
			}
			return start
		},
	}
}

const server = {
	counter: counter(),
	sync(clock: number, ops: Op[]) {
		this.counter.write(ops)
		return this.counter.history.slice(clock)
	},
}

function client() {
	return {
		remote: counter(),
		local: counter(),

		set(value: number) {
			this.local.set(value)
			this.sync()
		},

		increment(value: number) {
			this.local.increment(value)
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
			this.local.value = this.remote.value
			this.local.history = [...this.remote.history]
			this.local.write(rest)
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
