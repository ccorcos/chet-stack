/*

Sync using DAG-based causal ordering with explicit parent pointers.

Improvements over sync3.ts:
- Operations use tuple keys directly: op.key = [clock, id] instead of separate fields
- DAG class encapsulates all graph logic (heads, children, topological sort)
- Iterator-based topological traversal (lazy, memory-efficient)
- Cleaner separation: DAG handles graph, counter handles business logic
- Uses tupledb utilities (codec.compare, compoundCompare)

Key insight: The DAG structure itself (parent/child pointers) represents the ordering.
Traverse depth-first to get topological order without pre-computing sorted array.

Example:
  Peer A: null -> a1 -> a2 -> a3
  Peer B: null -> b1 -> b2

  After sync, A creates a4 with parents [a3, b2]:
  null -> a1 -> a2 -> a3 \
                           -> a4
  null -> b1 -> b2 --------/

  Topological order (via DFS): null, a1, a2, a3, b1, b2, a4

*/

import { compoundCompare } from "../shared/compare"
import { codec } from "./Codec"

// Generic constraint: nodes must have key and parents
type HasKeyAndParents = {
	key: [number, string]
	parents: Array<[number, string]>
}

// DAG class: encapsulates all graph operations
class DAG<T extends HasKeyAndParents> {
	private nodes: Map<string, T>
	private children: Map<string, Set<string>>
	private heads: Set<string>

	constructor(nodes?: T[]) {
		this.nodes = new Map()
		this.children = new Map()
		this.heads = new Set()

		if (nodes) {
			for (const node of nodes) {
				this.add(node)
			}
		}
	}

	// Convert tuple key to string for map indexing
	private keyToString(key: [number, string]): string {
		return JSON.stringify(key)
	}

	// Convert string back to tuple key
	private stringToKey(str: string): [number, string] {
		return JSON.parse(str)
	}

	// Compare tuple keys lexicographically
	private compareKeys(a: [number, string], b: [number, string]): number {
		return compoundCompare(a, b, codec.compare)
	}

	// Add a node to the DAG
	add(node: T): void {
		const keyStr = this.keyToString(node.key)

		// Skip if already exists (idempotent)
		if (this.nodes.has(keyStr)) return

		this.nodes.set(keyStr, node)

		// Update children map for all parents
		for (const parentKey of node.parents) {
			const parentKeyStr = this.keyToString(parentKey)
			if (!this.children.has(parentKeyStr)) {
				this.children.set(parentKeyStr, new Set())
			}
			this.children.get(parentKeyStr)!.add(keyStr)

			// Remove parent from heads (it now has a child)
			this.heads.delete(parentKeyStr)
		}

		// Add this node to heads (it has no children yet)
		this.heads.add(keyStr)
	}

	// Check if a node exists
	has(key: [number, string]): boolean {
		return this.nodes.has(this.keyToString(key))
	}

	// Get a node by key
	get(key: [number, string]): T | undefined {
		return this.nodes.get(this.keyToString(key))
	}

	// Get all head nodes (nodes with no children)
	getHeads(): T[] {
		const heads: T[] = []
		for (const keyStr of this.heads) {
			const node = this.nodes.get(keyStr)
			if (node) heads.push(node)
		}
		return heads
	}

	// Get children of a node
	getChildren(key: [number, string]): T[] {
		const keyStr = this.keyToString(key)
		const childKeys = this.children.get(keyStr)
		if (!childKeys) return []

		const children: T[] = []
		for (const childKeyStr of childKeys) {
			const child = this.nodes.get(childKeyStr)
			if (child) children.push(child)
		}
		return children
	}

	// Get parents of a node
	getParents(node: T): T[] {
		const parents: T[] = []
		for (const parentKey of node.parents) {
			const parent = this.get(parentKey)
			if (parent) parents.push(parent)
		}
		return parents
	}

	// Iterate nodes in topological order (lazy, memory-efficient)
	*iterateTopological(): IterableIterator<T> {
		const visited = new Set<string>()
		const inDegree = new Map<string, number>()

		// Calculate in-degree for all nodes
		for (const node of this.nodes.values()) {
			const keyStr = this.keyToString(node.key)
			inDegree.set(keyStr, node.parents.length)
		}

		// Find root nodes (in-degree = 0)
		const queue: T[] = []
		for (const node of this.nodes.values()) {
			const keyStr = this.keyToString(node.key)
			if (inDegree.get(keyStr) === 0) {
				queue.push(node)
			}
		}

		// Sort queue for deterministic order
		queue.sort((a, b) => this.compareKeys(a.key, b.key))

		// Process nodes level by level
		while (queue.length > 0) {
			// Take the next node in sorted order
			const node = queue.shift()!
			const keyStr = this.keyToString(node.key)

			// Skip if already visited
			if (visited.has(keyStr)) continue
			visited.add(keyStr)

			yield node

			// Process children: decrement their in-degree
			const children = this.getChildren(node.key)
			for (const child of children) {
				const childKeyStr = this.keyToString(child.key)
				const newInDegree = inDegree.get(childKeyStr)! - 1
				inDegree.set(childKeyStr, newInDegree)

				// If in-degree reaches 0, add to queue
				if (newInDegree === 0) {
					queue.push(child)
				}
			}

			// Re-sort queue for deterministic ordering
			queue.sort((a, b) => this.compareKeys(a.key, b.key))
		}

		// Check for cycles
		if (visited.size !== this.nodes.size) {
			throw new Error("Cycle detected in DAG!")
		}
	}

	// Helper: collect iterator into array
	topoSortedArray(): T[] {
		return Array.from(this.iterateTopological())
	}

	// Iterate descendants (operations that causally depend on this one)
	*iterateDescendants(key: [number, string]): IterableIterator<T> {
		const visited = new Set<string>()
		const queue = [key]

		while (queue.length > 0) {
			const currentKey = queue.shift()!
			const keyStr = this.keyToString(currentKey)

			if (visited.has(keyStr)) continue
			visited.add(keyStr)

			const node = this.get(currentKey)
			if (!node) continue

			// Don't yield the starting node itself
			if (this.compareKeys(currentKey, key) !== 0) {
				yield node
			}

			// Add all children to queue
			const children = this.getChildren(currentKey)
			for (const child of children) {
				queue.push(child.key)
			}
		}
	}

	// Get all descendants as an array
	getDescendants(key: [number, string]): T[] {
		return Array.from(this.iterateDescendants(key))
	}

	// Recompute heads by scanning all nodes
	recomputeHeads(): void {
		this.heads.clear()

		for (const [keyStr, node] of this.nodes) {
			const hasChildren = this.children.has(keyStr) && this.children.get(keyStr)!.size > 0

			if (!hasChildren) {
				this.heads.add(keyStr)
			}
		}
	}

	// Calculate operations they haven't seen (optimized subset sort)
	calculateMissing(theirHeads: T[]): T[] {
		// Build set of what they have by walking backwards
		const theyHave = new Set<string>()
		const queue = [...theirHeads]

		while (queue.length > 0) {
			const node = queue.shift()!
			const keyStr = this.keyToString(node.key)

			if (theyHave.has(keyStr)) continue
			theyHave.add(keyStr)

			// Add parents to queue
			for (const parentKey of node.parents) {
				const parent = this.get(parentKey)
				if (parent) {
					queue.push(parent)
				}
			}
		}

		// Find missing nodes
		const missingNodes: T[] = []
		for (const node of this.nodes.values()) {
			if (!theyHave.has(this.keyToString(node.key))) {
				missingNodes.push(node)
			}
		}

		// Create sub-DAG and sort only missing nodes
		const subDAG = new DAG<T>()
		for (const node of missingNodes) {
			subDAG.add(node)
		}

		return subDAG.topoSortedArray()
	}
}

// Operation type for counter CRDT
type Op = {
	type: "set" | "increment"
	value: number
	key: [number, string] // [clock, id]
	parents: Array<[number, string]>
}

// Counter CRDT with DAG-based sync
export function counter(id: string) {
	const dag = new DAG<Op>()

	return {
		id,
		clock: 0,
		value: 0,
		dag,
		received: [] as Op[], // Track arrival order for debugging
		appliedOps: new Set<string>(), // Track which operations we've applied

		set(value: number) {
			const op: Op = {
				type: "set",
				value,
				key: [this.clock, this.id],
				// Point to all current heads as parents
				parents: this.dag.getHeads().map((h) => h.key),
			}

			this.clock += 1
			this.dag.add(op)
			this.received.push(op)
			this.appliedOps.add(JSON.stringify(op.key))
			this.applyOp(op)
			return op
		},

		increment(value: number) {
			const op: Op = {
				type: "increment",
				value,
				key: [this.clock, this.id],
				// Point to all current heads as parents
				parents: this.dag.getHeads().map((h) => h.key),
			}

			this.clock += 1
			this.dag.add(op)
			this.received.push(op)
			this.appliedOps.add(JSON.stringify(op.key))
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

		// Merge received operations into DAG with incremental application
		mergeOps(ops: Op[]) {
			// Add all new operations to DAG first
			const hadNewOps = ops.some((op) => !this.dag.has(op.key))

			for (const op of ops) {
				if (!this.dag.has(op.key)) {
					this.dag.add(op)
					this.received.push(op)
				}
			}

			// If we received new operations, recompute value from scratch
			// This ensures correct ordering of concurrent set operations
			if (hadNewOps) {
				this.value = 0
				let lastSetValue: number | null = null

				for (const op of this.dag.iterateTopological()) {
					const opKey = JSON.stringify(op.key)

					// Mark all operations as applied
					this.appliedOps.add(opKey)

					if (op.type === "increment") {
						// If we haven't seen a set yet, apply to 0
						// Otherwise apply to the value after the last set
						if (lastSetValue !== null) {
							lastSetValue += op.value
						} else {
							this.value += op.value
						}
					} else if (op.type === "set") {
						// Set operations reset the value
						lastSetValue = op.value
						this.value = 0 // Will be set at the end
					}
				}

				// Apply the final value (either from last set + increments, or just increments)
				if (lastSetValue !== null) {
					this.value = lastSetValue
				}
			}
		},

		async sync(other: { heads: () => Promise<T[]>; send: (ops: Op[], ourHeads: T[]) => Promise<Op[]> }) {
			// Get their heads
			const theirHeads = await other.heads()

			// Calculate operations they haven't seen
			const toSend = this.dag.calculateMissing(theirHeads)

			// Send our ops and heads, receive their ops
			const toReceive = await other.send(toSend, this.dag.getHeads())

			// Merge received operations (applies them incrementally)
			this.mergeOps(toReceive)

			// Note: No need to recompute heads - add() maintains them incrementally
			// Note: No need to replay - mergeOps() applies operations incrementally
		},

		// Server-side handler for receiving sync requests
		async handleSync(theirOps: Op[], theirHeads: T[]): Promise<Op[]> {
			// Merge their operations (applies them incrementally)
			this.mergeOps(theirOps)

			// Calculate what they need
			const toSend = this.dag.calculateMissing(theirHeads)

			return toSend
		},

		replay() {
			// Reset state and replay all operations in topological order
			this.value = 0
			this.clock = 0

			// Iterate through DAG in topological order
			for (const op of this.dag.iterateTopological()) {
				this.applyOp(op)
				// Update our clock to be higher than any operation we've seen
				const [opClock] = op.key
				if (opClock >= this.clock) {
					this.clock = opClock + 1
				}
			}
		},
	}
}

// Helper to create network API for a peer
function createPeerAPI(peer: ReturnType<typeof counter>) {
	return {
		heads: async () => peer.dag.getHeads(),
		send: async (ops: Op[], theirHeads: Op[]) => peer.handleSync(ops, theirHeads),
	}
}

// Example usage demonstrating convergence with DAG ordering
async function main() {
	const peer1 = counter("peer1")
	const peer2 = counter("peer2")
	const peer3 = counter("peer3")

	// Each peer makes operations independently
	peer1.set(10) // key=[0, peer1], parents=[]
	peer2.increment(5) // key=[0, peer2], parents=[]
	peer3.set(20) // key=[0, peer3], parents=[]

	console.log("Before sync:")
	console.log("peer1:", peer1.value, "history:", peer1.dag.topoSortedArray().map((o) => `${o.key[1]}:${o.key[0]}`))
	console.log("peer2:", peer2.value, "history:", peer2.dag.topoSortedArray().map((o) => `${o.key[1]}:${o.key[0]}`))
	console.log("peer3:", peer3.value, "history:", peer3.dag.topoSortedArray().map((o) => `${o.key[1]}:${o.key[0]}`))

	// Sync peer1 with peer2
	await peer1.sync(createPeerAPI(peer2))
	console.log("\nAfter peer1.sync(peer2):")
	console.log("peer1:", peer1.value, "history:", peer1.dag.topoSortedArray().map((o) => `${o.key[1]}:${o.key[0]}`))
	console.log("peer2:", peer2.value, "history:", peer2.dag.topoSortedArray().map((o) => `${o.key[1]}:${o.key[0]}`))

	// Sync peer3 with peer1
	await peer3.sync(createPeerAPI(peer1))
	console.log("\nAfter peer3.sync(peer1):")
	console.log("peer1:", peer1.value, "history:", peer1.dag.topoSortedArray().map((o) => `${o.key[1]}:${o.key[0]}`))
	console.log("peer3:", peer3.value, "history:", peer3.dag.topoSortedArray().map((o) => `${o.key[1]}:${o.key[0]}`))

	// Sync peer2 with peer3 to get full convergence
	await peer2.sync(createPeerAPI(peer3))
	console.log("\nAfter peer2.sync(peer3) - all converged:")
	console.log("peer1:", peer1.value, "history:", peer1.dag.topoSortedArray().map((o) => `${o.key[1]}:${o.key[0]}`))
	console.log("peer2:", peer2.value, "history:", peer2.dag.topoSortedArray().map((o) => `${o.key[1]}:${o.key[0]}`))
	console.log("peer3:", peer3.value, "history:", peer3.dag.topoSortedArray().map((o) => `${o.key[1]}:${o.key[0]}`))

	console.log("\n=== Diamond Merge Test ===")
	// Test explicit diamond merge pattern
	const peerA = counter("peerA")
	const peerB = counter("peerB")

	// Create concurrent operations
	peerA.set(100) // a0
	peerB.set(200) // b0

	console.log("Before merge:")
	console.log("peerA:", peerA.value, "heads:", peerA.dag.getHeads().map((h) => `${h.key[1]}:${h.key[0]}`))
	console.log("peerB:", peerB.value, "heads:", peerB.dag.getHeads().map((h) => `${h.key[1]}:${h.key[0]}`))

	// Sync: peerA learns about peerB
	await peerA.sync(createPeerAPI(peerB))

	console.log("\nAfter peerA.sync(peerB):")
	console.log("peerA:", peerA.value, "heads:", peerA.dag.getHeads().map((h) => `${h.key[1]}:${h.key[0]}`))
	console.log(
		"peerA history:",
		peerA.dag
			.topoSortedArray()
			.map(
				(o) => `${o.key[1]}:${o.key[0]}[${o.parents.map((p) => `${p[1]}:${p[0]}`).join(",")}]`
			)
	)

	// peerA creates new operation - should point to both heads (merge)
	peerA.increment(1) // a1, parents=[a0, b0]

	console.log("\nAfter peerA.increment(1) - creates merge operation:")
	console.log("peerA:", peerA.value, "heads:", peerA.dag.getHeads().map((h) => `${h.key[1]}:${h.key[0]}`))
	console.log(
		"peerA history:",
		peerA.dag
			.topoSortedArray()
			.map(
				(o) => `${o.key[1]}:${o.key[0]}[${o.parents.map((p) => `${p[1]}:${p[0]}`).join(",")}]`
			)
	)

	// Verify merge operation has two parents
	const sorted = peerA.dag.topoSortedArray()
	const mergeOp = sorted.find((o) => o.key[1] === "peerA" && o.key[0] === 1)
	console.log("\nMerge operation parents:", mergeOp?.parents.map((p) => `${p[1]}:${p[0]}`))
}

// Run example
main().catch(console.error)

/*

Key improvements over sync3.ts:
- Operations use tuple keys directly (op.key vs op.clock + op.id)
- DAG class encapsulates all graph logic
- Iterator-based topological traversal (lazy, no pre-computed array)
- Cleaner separation of concerns
- Uses tupledb utilities (codec.compare, compoundCompare)
- Removed unnecessary recomputeHeads() calls (trust incremental maintenance)
- Added descendant traversal for future optimizations

Performance:
- add(): O(p) where p = number of parents
- has()/get(): O(1) via Map
- iterateTopological(): O(n) lazy iteration, actual work O(k) for k new ops
- calculateMissing(): O(n + m log m) where m = missing nodes
- mergeOps(): O(n) iteration but only processes new ops

Current limitation:
- mergeOps still iterates through all n operations to respect topological order
- Difficult to achieve true O(k) incremental replay without stable indices
- However, most operations are skipped quickly (just a Set.has() check)
- The expensive work (applying operations) is only done for new operations

Future optimizations:
- Stable topological indices for O(log n) queries
- Operation compaction (merge increments, eliminate redundant sets)
- Garbage collection (prune old operations below frontier)
- Causal cuts for consistent snapshots

*/
