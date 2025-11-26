/*

Sync an array.
- logical clock for causality.
- central server authority on transaction ordering, last-write-wins

Problems that we will ignore for now:
- idempotency of writes
- concurrent calls to sync
- concurrent operations at different indices (proper CRDT would use unique IDs for positions)

Benefits:
- we can ignore history before the last sync.

Note: This is a simplified version. A proper CRDT like y.Array uses position identifiers
rather than indices to handle concurrent insertions/deletions properly.

*/

type Op =
	| { type: "insert"; index: number; value: any }
	| { type: "delete"; index: number }
	| { type: "push"; value: any }
	| { type: "set"; index: number; value: any }

export function array() {
	return {
		clock: 0,
		value: [] as any[],
		history: [] as Op[],

		insert(index: number, value: any) {
			const clock = this.clock
			this.history[clock] = { type: "insert", index, value }
			this.value.splice(index, 0, value)
			this.clock += 1
		},

		delete(index: number) {
			const clock = this.clock
			this.history[clock] = { type: "delete", index }
			this.value.splice(index, 1)
			this.clock += 1
		},

		push(value: any) {
			const clock = this.clock
			this.history[clock] = { type: "push", value }
			this.value.push(value)
			this.clock += 1
		},

		set(index: number, value: any) {
			const clock = this.clock
			this.history[clock] = { type: "set", index, value }
			this.value[index] = value
			this.clock += 1
		},

		write(ops: Op[]) {
			const start = this.clock
			for (const op of ops) {
				if (op.type === "insert") {
					this.insert(op.index, op.value)
				} else if (op.type === "delete") {
					this.delete(op.index)
				} else if (op.type === "push") {
					this.push(op.value)
				} else if (op.type === "set") {
					this.set(op.index, op.value)
				}
			}
			return start
		},
	}
}

const server = {
	array: array(),
	sync(clock: number, ops: Op[]) {
		this.array.write(ops)
		return this.array.history.slice(clock)
	},
}

function client() {
	return {
		remote: array(),
		local: array(),

		insert(index: number, value: any) {
			this.local.insert(index, value)
			this.sync()
		},

		delete(index: number) {
			this.local.delete(index)
			this.sync()
		},

		push(value: any) {
			this.local.push(value)
			this.sync()
		},

		set(index: number, value: any) {
			this.local.set(index, value)
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
			this.local.value = [...this.remote.value]
			this.local.history = [...this.remote.history]
			this.local.write(rest)
		},
	}
}

// Think about...
// - pubsub for the clock -> call client.sync()
// - proper CRDT with position identifiers instead of indices
// - handling concurrent insertions at the same index
// - y.Array uses a linked list with unique IDs for each element
