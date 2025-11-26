/*

Sync a number P2P using [clock, id] ordering.

Two histories:
1. received: The order operations arrived at this peer (doesn't converge)
2. history: The deterministic [clock, id] sorted order (converges)

Frontier: Vector clock tracking the last clock seen from each peer.

Problems that we will ignore for now:
- idempotency of writes
- concurrent calls to sync

Considerations:
- clock explosion with lots of writers, O(n) users cost on sync.

*/

type Op = { type: "set" | "increment"; value: number; clock: number; id: string }

export function counter(id: string) {
	return {
		id,
		clock: 0,
		value: 0,
		// Deterministic converged order [clock, id]
		history: [] as Op[],
		// Order operations were received by this peer
		received: [] as Op[],
		// Frontier: last clock seen from each peer
		frontier: {} as Record<string, number>,

		set(value: number) {
			const clock = this.clock
			const op: Op = { type: "set", value, clock, id: this.id }
			this.clock += 1
			this.history.push(op)
			this.received.push(op)
			this.frontier[this.id] = clock
			this.applyOp(op)
			return op
		},

		increment(value: number) {
			const clock = this.clock
			const op: Op = { type: "increment", value, clock, id: this.id }
			this.clock += 1
			this.history.push(op)
			this.received.push(op)
			this.frontier[this.id] = clock
			this.applyOp(op)
			return op
		},

		applyOp(op: Op) {
			if (op.type === "set") {
				this.value = op.value
			} else if (op.type === "increment") {
				this.value += op.value
			}
		},

		async sync(other: {
			frontier: () => Promise<Record<string, number>>
			send: (ops: Op[], frontier: Record<string, number>) => Promise<Op[]>
		}) {
			// Get their frontier
			const theirFrontier = await other.frontier()

			// Calculate operations they haven't seen
			// Note: Could be more efficient if history is sorted - could binary search
			// or track indices by peer. Linear scan is simple for now.
			const toSend = this.history.filter((op) => {
				const theirClock = theirFrontier[op.id] ?? -1
				return op.clock > theirClock
			})

			// Send our ops and frontier, receive their ops
			const toReceive = await other.send(toSend, this.frontier)

			// Merge received operations
			for (const op of toReceive) {
				this.received.push(op)
				this.history.push(op)
				this.frontier[op.id] = Math.max(this.frontier[op.id] ?? -1, op.clock)
			}

			// Re-sort history by [clock, id] for deterministic order
			const sortByClockId = (a: Op, b: Op) => {
				if (a.clock !== b.clock) return a.clock - b.clock
				return a.id.localeCompare(b.id)
			}
			this.history.sort(sortByClockId)

			// Replay operations to converge
			this.replay()
		},

		// Server-side handler for receiving sync requests
		async handleSync(theirOps: Op[], theirFrontier: Record<string, number>): Promise<Op[]> {
			// Merge their operations
			for (const op of theirOps) {
				this.received.push(op)
				this.history.push(op)
				this.frontier[op.id] = Math.max(this.frontier[op.id] ?? -1, op.clock)
			}

			// Re-sort and replay
			const sortByClockId = (a: Op, b: Op) => {
				if (a.clock !== b.clock) return a.clock - b.clock
				return a.id.localeCompare(b.id)
			}
			this.history.sort(sortByClockId)
			this.replay()

			// Calculate what they need
			// Note: Could be more efficient with sorted history
			const toSend = this.history.filter((op) => {
				const theirClock = theirFrontier[op.id] ?? -1
				return op.clock > theirClock
			})

			return toSend
		},

		replay() {
			// Reset state and replay all operations
			// Note: This is inefficient - could optimize by:
			// 1. Only replaying from the divergence point (common ancestor)
			// 2. Compacting operations (e.g., merge consecutive increments, drop set+increment)
			this.value = 0
			this.clock = 0

			// Replay all operations in deterministic order
			for (const op of this.history) {
				this.applyOp(op)
				// Update our clock to be higher than any operation we've seen
				if (op.clock >= this.clock) {
					this.clock = op.clock + 1
				}
			}
		},
	}
}

// Helper to create network API for a peer
function createPeerAPI(peer: ReturnType<typeof counter>) {
	return {
		frontier: async () => peer.frontier,
		send: async (ops: Op[], frontier: Record<string, number>) => peer.handleSync(ops, frontier),
	}
}

// Example usage demonstrating convergence
async function main() {
	const peer1 = counter("peer1")
	const peer2 = counter("peer2")
	const peer3 = counter("peer3")

	// Each peer makes operations independently
	peer1.set(10) // clock=0, id=peer1
	peer2.increment(5) // clock=0, id=peer2
	peer3.set(20) // clock=0, id=peer3

	console.log("Before sync:")
	console.log(
		"peer1:",
		peer1.value,
		"history:",
		peer1.history.map((o) => `${o.id}:${o.clock}`)
	)
	console.log(
		"peer2:",
		peer2.value,
		"history:",
		peer2.history.map((o) => `${o.id}:${o.clock}`)
	)
	console.log(
		"peer3:",
		peer3.value,
		"history:",
		peer3.history.map((o) => `${o.id}:${o.clock}`)
	)

	// Sync peer1 with peer2
	await peer1.sync(createPeerAPI(peer2))
	console.log("\nAfter peer1.sync(peer2):")
	console.log(
		"peer1:",
		peer1.value,
		"history:",
		peer1.history.map((o) => `${o.id}:${o.clock}`)
	)
	console.log(
		"peer2:",
		peer2.value,
		"history:",
		peer2.history.map((o) => `${o.id}:${o.clock}`)
	)

	// Sync peer3 with peer1
	await peer3.sync(createPeerAPI(peer1))
	console.log("\nAfter peer3.sync(peer1):")
	console.log(
		"peer1:",
		peer1.value,
		"history:",
		peer1.history.map((o) => `${o.id}:${o.clock}`)
	)
	console.log(
		"peer3:",
		peer3.value,
		"history:",
		peer3.history.map((o) => `${o.id}:${o.clock}`)
	)

	// Sync peer2 with peer3 to get full convergence
	await peer2.sync(createPeerAPI(peer3))
	console.log("\nAfter peer2.sync(peer3) - all converged:")
	console.log(
		"peer1:",
		peer1.value,
		"history:",
		peer1.history.map((o) => `${o.id}:${o.clock}`)
	)
	console.log(
		"peer2:",
		peer2.value,
		"history:",
		peer2.history.map((o) => `${o.id}:${o.clock}`)
	)
	console.log(
		"peer3:",
		peer3.value,
		"history:",
		peer3.history.map((o) => `${o.id}:${o.clock}`)
	)
}

// Run example
main().catch(console.error)

/*

Think about...
- Concurrent operations during sync
- More efficient filtering with sorted history (binary search for toSend/toReceive)
- More efficient replay:
  * Only replay from divergence point instead of full history
  * Compact operations (merge increments, eliminate redundant sets)
- Compaction/pruning old operations
- Network errors and retry logic

Next extensions:
1. Map data structure (y.Map style)
2. List/array data structure (y.Array style)
3. Chat room with edit/delete operations

*/
