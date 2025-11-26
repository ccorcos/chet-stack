/*

Sync using DAG-based causal ordering with explicit parent pointers.

Differences from sync2.ts:
- Operations point to parent operations, forming a DAG
- Ordering via topological sort instead of [clock, id] sort
- Sync protocol uses heads (operations with no children) instead of frontier
- Explicit merge operations when branches converge

Key insight: Operations explicitly declare dependencies via parent pointers.
This creates a Git-like DAG structure where merge operations have multiple parents.

Example:
  Peer A: null -> a1 -> a2 -> a3
  Peer B: null -> b1 -> b2

  After sync, A creates a4 with parents [a3, b2]:
  null -> a1 -> a2 -> a3 \
                           -> a4
  null -> b1 -> b2 --------/

  Topological order: null, a1, a2, a3, b1, b2, a4

*/

type Op = {
	type: "set" | "increment"
	value: number
	clock: number
	id: string
	// Parent operations this one depends on (empty for first operation)
	parents: Array<[number, string]>
}

// Helper: Create unique key for operation
function opKey(clock: number, id: string): string {
	return `${clock}:${id}`
}

function opKeyFromOp(op: Op): string {
	return opKey(op.clock, op.id)
}

export function counter(id: string) {
	return {
		id,
		clock: 0,
		value: 0,
		// Deterministic converged order (topologically sorted)
		history: [] as Op[],
		// Order operations were received by this peer
		received: [] as Op[],
		// Heads: operations with no children
		heads: new Map<string, Op>(),
		// Children map for efficient DAG traversal
		children: new Map<string, Set<string>>(),

		set(value: number) {
			const clock = this.clock
			const op: Op = {
				type: "set",
				value,
				clock,
				id: this.id,
				// Point to all current heads as parents
				parents: Array.from(this.heads.values()).map((h) => [h.clock, h.id] as [number, string]),
			}

			this.clock += 1
			this.history.push(op)
			this.received.push(op)

			// Update heads: remove parents, add this operation
			for (const parent of op.parents) {
				const parentKey = opKey(parent[0], parent[1])
				this.heads.delete(parentKey)
			}
			this.heads.set(opKeyFromOp(op), op)

			// Update children map
			for (const parent of op.parents) {
				const parentKey = opKey(parent[0], parent[1])
				if (!this.children.has(parentKey)) {
					this.children.set(parentKey, new Set())
				}
				this.children.get(parentKey)!.add(opKeyFromOp(op))
			}

			this.applyOp(op)
			return op
		},

		increment(value: number) {
			const clock = this.clock
			const op: Op = {
				type: "increment",
				value,
				clock,
				id: this.id,
				// Point to all current heads as parents
				parents: Array.from(this.heads.values()).map((h) => [h.clock, h.id] as [number, string]),
			}

			this.clock += 1
			this.history.push(op)
			this.received.push(op)

			// Update heads: remove parents, add this operation
			for (const parent of op.parents) {
				const parentKey = opKey(parent[0], parent[1])
				this.heads.delete(parentKey)
			}
			this.heads.set(opKeyFromOp(op), op)

			// Update children map
			for (const parent of op.parents) {
				const parentKey = opKey(parent[0], parent[1])
				if (!this.children.has(parentKey)) {
					this.children.set(parentKey, new Set())
				}
				this.children.get(parentKey)!.add(opKeyFromOp(op))
			}

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

		// Merge received operations into history
		mergeOps(ops: Op[]) {
			for (const op of ops) {
				const key = opKeyFromOp(op)

				// Skip if we already have it
				if (this.history.some((h) => opKeyFromOp(h) === key)) {
					continue
				}

				this.received.push(op)
				this.history.push(op)

				// Update children map
				for (const parent of op.parents) {
					const parentKey = opKey(parent[0], parent[1])
					if (!this.children.has(parentKey)) {
						this.children.set(parentKey, new Set())
					}
					this.children.get(parentKey)!.add(key)
				}
			}
		},

		// Recompute heads: operations with no children
		recomputeHeads() {
			this.heads.clear()

			for (const op of this.history) {
				const key = opKeyFromOp(op)
				const hasChildren = this.children.has(key) && this.children.get(key)!.size > 0

				if (!hasChildren) {
					this.heads.set(key, op)
				}
			}
		},

		// Topological sort using Kahn's algorithm with [clock, id] tiebreaking
		topologicalSort() {
			// Build in-degree map
			const inDegree = new Map<string, number>()
			const opMap = new Map<string, Op>()

			for (const op of this.history) {
				const key = opKeyFromOp(op)
				opMap.set(key, op)
				inDegree.set(key, op.parents.length)
			}

			// Find all roots (operations with no parents)
			const queue: Op[] = []
			for (const op of this.history) {
				if (op.parents.length === 0) {
					queue.push(op)
				}
			}

			// Sort queue by [clock, id] for deterministic tiebreaking
			queue.sort((a, b) => {
				if (a.clock !== b.clock) return a.clock - b.clock
				return a.id.localeCompare(b.id)
			})

			const sorted: Op[] = []

			while (queue.length > 0) {
				// Take the smallest by [clock, id] ordering
				const op = queue.shift()!
				sorted.push(op)

				const key = opKeyFromOp(op)
				const children = this.children.get(key)

				if (children) {
					for (const childKey of children) {
						const childOp = opMap.get(childKey)!
						const newInDegree = inDegree.get(childKey)! - 1
						inDegree.set(childKey, newInDegree)

						if (newInDegree === 0) {
							queue.push(childOp)
						}
					}

					// Re-sort queue after adding new operations
					queue.sort((a, b) => {
						if (a.clock !== b.clock) return a.clock - b.clock
						return a.id.localeCompare(b.id)
					})
				}
			}

			// Cycle detection
			if (sorted.length !== this.history.length) {
				throw new Error("Cycle detected in operation DAG!")
			}

			this.history = sorted
		},

		// Calculate operations they need by walking DAG backwards from their heads
		calculateMissingOps(theirHeads: Map<string, Op>): Op[] {
			// Build set of operations they have by walking backwards from their heads
			const theyHave = new Set<string>()
			const queue: Op[] = Array.from(theirHeads.values())

			while (queue.length > 0) {
				const op = queue.shift()!
				const key = opKeyFromOp(op)

				if (theyHave.has(key)) continue
				theyHave.add(key)

				// Add parents to queue
				for (const [pClock, pId] of op.parents) {
					const parentOp = this.history.find((h) => h.clock === pClock && h.id === pId)
					if (parentOp) {
						queue.push(parentOp)
					}
				}
			}

			// Return operations we have that they don't
			return this.history.filter((op) => !theyHave.has(opKeyFromOp(op)))
		},

		async sync(other: {
			heads: () => Promise<Map<string, Op>>
			send: (ops: Op[], ourHeads: Map<string, Op>) => Promise<Op[]>
		}) {
			// Get their heads
			const theirHeads = await other.heads()

			// Calculate operations they haven't seen
			const toSend = this.calculateMissingOps(theirHeads)

			// Send our ops and heads, receive their ops
			const toReceive = await other.send(toSend, this.heads)

			// Merge received operations
			this.mergeOps(toReceive)

			// Recompute heads (some of our heads might now have children)
			this.recomputeHeads()

			// Perform topological sort to get deterministic order
			this.topologicalSort()

			// Replay operations to converge
			this.replay()
		},

		// Server-side handler for receiving sync requests
		async handleSync(theirOps: Op[], theirHeads: Map<string, Op>): Promise<Op[]> {
			// Merge their operations
			this.mergeOps(theirOps)

			// Recompute heads and sort
			this.recomputeHeads()
			this.topologicalSort()
			this.replay()

			// Calculate what they need
			const toSend = this.calculateMissingOps(theirHeads)

			return toSend
		},

		replay() {
			// Reset state and replay all operations
			// Note: This is inefficient - could optimize by:
			// 1. Only replaying from the divergence point (common ancestor)
			// 2. Compacting operations (e.g., merge consecutive increments)
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
		heads: async () => peer.heads,
		send: async (ops: Op[], theirHeads: Map<string, Op>) => peer.handleSync(ops, theirHeads),
	}
}

// Example usage demonstrating convergence with DAG ordering
async function main() {
	const peer1 = counter("peer1")
	const peer2 = counter("peer2")
	const peer3 = counter("peer3")

	// Each peer makes operations independently
	peer1.set(10) // clock=0, id=peer1, parents=[]
	peer2.increment(5) // clock=0, id=peer2, parents=[]
	peer3.set(20) // clock=0, id=peer3, parents=[]

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

	console.log("\n=== Diamond Merge Test ===")
	// Test explicit diamond merge pattern
	const peerA = counter("peerA")
	const peerB = counter("peerB")

	// Create concurrent operations
	peerA.set(100) // a0
	peerB.set(200) // b0

	console.log("Before merge:")
	console.log("peerA:", peerA.value, "heads:", Array.from(peerA.heads.keys()))
	console.log("peerB:", peerB.value, "heads:", Array.from(peerB.heads.keys()))

	// Sync: peerA learns about peerB
	await peerA.sync(createPeerAPI(peerB))

	console.log("\nAfter peerA.sync(peerB):")
	console.log("peerA:", peerA.value, "heads:", Array.from(peerA.heads.keys()))
	console.log(
		"peerA history:",
		peerA.history.map(
			(o) => `${o.id}:${o.clock}[${o.parents.map((p) => `${p[1]}:${p[0]}`).join(",")}]`
		)
	)

	// peerA creates new operation - should point to both heads (merge)
	peerA.increment(1) // a1, parents=[a0, b0]

	console.log("\nAfter peerA.increment(1) - creates merge operation:")
	console.log("peerA:", peerA.value, "heads:", Array.from(peerA.heads.keys()))
	console.log(
		"peerA history:",
		peerA.history.map(
			(o) => `${o.id}:${o.clock}[${o.parents.map((p) => `${p[1]}:${p[0]}`).join(",")}]`
		)
	)

	// Verify merge operation has two parents
	const mergeOp = peerA.history.find((o) => o.id === "peerA" && o.clock === 1)
	console.log(
		"\nMerge operation parents:",
		mergeOp?.parents.map((p) => `${p[1]}:${p[0]}`)
	)
}

// Run example
main().catch(console.error)

/*

Think about...
- Performance: O(n) history scan for calculateMissingOps - could use opKey index
- Incremental replay from divergence point instead of full replay
- Operation compaction (merge increments, eliminate redundant sets)
- Handling missing parent references in received operations
- Network errors and retry logic

Key insight over sync2.ts:
- DAG explicitly represents causality, enabling correct conflict resolution
- Critical for complex CRDTs (maps, text, lists) beyond simple counters
- Enables partial replication (can replicate any causal cut)
- Slight overhead (~5-10%) for much stronger guarantees

*/
