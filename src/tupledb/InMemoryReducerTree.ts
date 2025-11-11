import { orderedArray } from "@ccorcos/ordered-array"

export type BranchNode<K, D> = {
	leaf?: false
	id: string
	data: D
	children: { minKey: K | null; data: D; childId: string }[]
}

export type LeafNode<K, V, D> = {
	leaf: true
	id: string
	data: D
	values: { key: K; value: V }[]
}

function compare(a: any, b: any) {
	if (a === b) return 0
	if (a > b) return 1
	return -1
}

export type NodeCursor<K, V, D> = {
	nodePath: (BranchNode<K, D> | LeafNode<K, V, D>)[]
	indexPath: number[]
}

export type TreeReducer<K, V, D> = {
	leaf: (values: LeafNode<K, V, D>["values"]) => D
	branch: (children: BranchNode<K, D>["children"]) => D
}

export function combineTreeReducers<A extends { [key: string]: TreeReducer<any, any, any> }>(
	reducers: A
) {
	const combined: TreeReducer<
		A[keyof A] extends TreeReducer<infer K, any, any> ? K : never,
		A[keyof A] extends TreeReducer<any, infer V, any> ? V : never,
		{ [K in keyof A]: ReturnType<A[K]["leaf"]> }
	> = {
		leaf: (values) => {
			const data: any = {}
			for (const [key, reducer] of Object.entries(reducers)) {
				data[key] = reducer.leaf(values)
			}
			return data
		},
		branch: (children) => {
			const data: any = {}
			for (const [key, reducer] of Object.entries(reducers)) {
				data[key] = reducer.branch(children.map((child) => ({ ...child, data: child.data[key] })))
			}
			return data
		},
	}
	return combined
}

export class InMemoryReducerTree<K = string | number, V = any, D = any> {
	nodes = new Map<string, BranchNode<K, D> | LeafNode<K, V, D>>()

	/**
	 * minSize must be less than maxSize / 2.
	 */
	constructor(
		public minSize: number,
		public maxSize: number,
		public reducer: TreeReducer<K, V, D>,
		public compareKey: (a: K, b: K) => number = compare
	) {
		if (minSize > maxSize / 2) throw new Error("Invalid tree size.")
	}

	private get leafValues() {
		return orderedArray((item: { key: K }) => item.key, this.compareKey)
	}

	private compareBranchKey = (a: K | null, b: K | null) => {
		if (a === null || b === null) {
			if (a === null) return -1
			if (b === null) return 1
		}
		return this.compareKey(a, b)
	}

	private branchChildren = orderedArray(
		(item: { minKey: K | null }) => item.minKey,
		this.compareBranchKey
	)

	private findPath(key: K): NodeCursor<K, V, D> {
		const nodePath: (BranchNode<K, D> | LeafNode<K, V, D>)[] = []
		const indexPath: number[] = []

		const root = this.nodes.get("root")
		if (!root) return { nodePath, indexPath }
		else nodePath.push(root)

		while (true) {
			const node = nodePath[0]
			if (node.leaf) return { nodePath, indexPath }

			const result = this.branchChildren.search(node.children, key)

			// Closest key that is at least as big as the key...
			// So the closest should never be less than the minKey.
			if (result.closest === 0) throw new Error("Broken.")

			const childIndex = result.found !== undefined ? result.found : result.closest - 1
			const childId = node.children[childIndex].childId
			const child = this.nodes.get(childId)
			if (!child) throw Error("Missing child node.")
			nodePath.unshift(child)
			indexPath.unshift(childIndex)
		}
	}

	get(key: K): V | undefined {
		const { nodePath } = this.findPath(key)
		if (nodePath.length === 0) return

		const leaf = nodePath[0] as LeafNode<K, V, D>
		const result = this.leafValues.search(leaf.values, key)
		if (result.found === undefined) return
		return leaf.values[result.found].value
	}

	private startCursor() {
		const cursor: NodeCursor<K, V, D> = {
			nodePath: [],
			indexPath: [],
		}
		const root = this.nodes.get("root")
		if (!root) return cursor
		cursor.nodePath.push(root)

		while (true) {
			const node = cursor.nodePath[0]
			if (node.leaf) break
			const childIndex = 0
			const childId = node.children[childIndex].childId
			const child = this.nodes.get(childId)
			if (!child) throw new Error("Broken.")
			cursor.nodePath.unshift(child)
			cursor.indexPath.unshift(childIndex)
		}
		return cursor
	}

	private nextCursor(cursor: NodeCursor<K, V, D>): NodeCursor<K, V, D> | undefined {
		// console.log(cursor)
		cursor = {
			nodePath: [...cursor.nodePath],
			indexPath: [...cursor.indexPath],
		}
		for (let i = 0; i < cursor.nodePath.length - 1; i++) {
			// Find the point in the path where we need to go down a sibling branch.
			const parent = cursor.nodePath[i + 1] as BranchNode<K, D>
			const parentIndex = cursor.indexPath[i]
			const nextIndex = parentIndex + 1
			if (nextIndex >= parent.children.length) continue

			// Here's a branch.
			cursor.indexPath[i] = nextIndex

			// Fix the rest of the cursor.
			for (let j = i; j >= 0; j--) {
				const parent = cursor.nodePath[j + 1] as BranchNode<K, D>
				const parentIndex = cursor.indexPath[j]
				const childId = parent.children[parentIndex].childId
				const child = this.nodes.get(childId)
				if (!child) throw new Error("Broken.")
				cursor.nodePath[j] = child
				if (j > 0) cursor.indexPath[j - 1] = 0
			}
			return cursor
		}
	}

	private endCursor() {
		const cursor: NodeCursor<K, V, D> = {
			nodePath: [],
			indexPath: [],
		}
		const root = this.nodes.get("root")
		if (!root) return cursor
		cursor.nodePath.push(root)
		while (true) {
			const node = cursor.nodePath[0]
			if (node.leaf) break
			const childIndex = node.children.length - 1
			const childId = node.children[childIndex].childId
			const child = this.nodes.get(childId)
			if (!child) throw new Error("Broken.")
			cursor.nodePath.unshift(child)
			cursor.indexPath.unshift(childIndex)
		}
		return cursor
	}

	private prevCursor(cursor: NodeCursor<K, V, D>): NodeCursor<K, V, D> | undefined {
		cursor = {
			nodePath: [...cursor.nodePath],
			indexPath: [...cursor.indexPath],
		}
		for (let i = 0; i < cursor.nodePath.length - 1; i++) {
			// Find the point in the path where we need to go down a sibling branch.
			const parentIndex = cursor.indexPath[i]
			const prevIndex = parentIndex - 1
			if (prevIndex < 0) continue

			// Here's a branch.
			cursor.indexPath[i] = prevIndex

			// Fix the rest of the cursor.
			for (let j = i; j >= 0; j--) {
				const parent = cursor.nodePath[j + 1] as BranchNode<K, D>
				const parentIndex = cursor.indexPath[j]
				const childId = parent.children[parentIndex].childId
				const child = this.nodes.get(childId)
				if (!child) throw new Error("Broken.")
				cursor.nodePath[j] = child
				if (j > 0)
					cursor.indexPath[j - 1] = child.leaf ? child.values.length - 1 : child.children.length - 1
			}
			return cursor
		}
	}

	list(
		args: {
			gt?: K
			gte?: K
			lt?: K
			lte?: K
			limit?: number
			reverse?: boolean
		} = {}
	) {
		const results: { key: K; value: V }[] = []

		if (args.gt !== undefined && args.gte !== undefined)
			throw new Error("Invalid redundant bounds: {gt, gte}")
		if (args.lt !== undefined && args.lte !== undefined)
			throw new Error("Invalid redundant bounds: {lt, lte}")

		const start = args.gt !== undefined ? args.gt : args.gte !== undefined ? args.gte : undefined
		const startOpen = args.gt !== undefined
		const end = args.lt !== undefined ? args.lt : args.lte !== undefined ? args.lte : undefined
		const endOpen = args.lt !== undefined

		if (start !== undefined && end !== undefined) {
			const comp = this.compareKey(start, end)
			if (comp > 0) {
				throw new Error("Invalid bounds.")
			}
			if (comp === 0 && (startOpen || endOpen)) {
				throw new Error("Invalid open bounds.")
			}
		}

		let startKey: NodeCursor<K, V, D> | undefined
		let endKey: NodeCursor<K, V, D> | undefined
		if (start !== undefined) {
			startKey = this.findPath(start)
		} else {
			startKey = this.startCursor()
		}

		// Empty tree
		if (startKey.nodePath.length === 0) {
			return []
		}

		if (end !== undefined) {
			endKey = this.findPath(end)
		} else {
			endKey = this.endCursor()
		}

		if (args.reverse) {
			const leaf = endKey.nodePath[0] as LeafNode<K, V, D>
			if (end !== undefined) {
				const result = this.leafValues.search(leaf.values, end)
				const index =
					result.found !== undefined ? (endOpen ? result.found : result.found + 1) : result.closest
				results.push(...leaf.values.slice(0, index).reverse())
			} else {
				results.push(...leaf.values.slice(0).reverse())
			}

			// Start bound in the same leaf.
			if (start !== undefined && this.compareKey(leaf.values[0].key, start) <= 0) {
				const result = this.leafValues.search(leaf.values, start)
				if (result.found !== undefined) {
					const startIndex = startOpen
						? results.length - result.found - 1
						: results.length - result.found
					results.splice(startIndex, results.length)
				} else {
					results.splice(results.length - result.closest, results.length)
				}

				// Start and limit bound
				if (args.limit && results.length >= args.limit) {
					results.splice(args.limit, results.length)
					return results
				}
				return results
			}

			// Limit bound
			if (args.limit && results.length >= args.limit) {
				results.splice(args.limit, results.length)
				return results
			}

			let cursor: NodeCursor<K, V, D> | undefined = endKey
			while ((cursor = this.prevCursor(cursor))) {
				const leaf = cursor.nodePath[0] as LeafNode<K, V, D>

				results.push(...leaf.values.slice(0).reverse())

				// Start bound
				if (start !== undefined && this.compareKey(leaf.values[0].key, start) <= 0) {
					const result = this.leafValues.search(leaf.values, start)
					if (result.found !== undefined) {
						const startIndex = startOpen
							? results.length - result.found - 1
							: results.length - result.found
						results.splice(startIndex, results.length)
					} else {
						results.splice(results.length - result.closest, results.length)
					}

					// Start and limit bound
					if (args.limit && results.length >= args.limit) {
						results.splice(args.limit, results.length)
						return results
					}
					return results
				}

				// Limit bound
				if (args.limit && results.length >= args.limit) {
					results.splice(args.limit, results.length)
					return results
				}
			}

			return results
		}

		let startOffset = 0
		const leaf = startKey.nodePath[0] as LeafNode<K, V, D>
		if (start !== undefined) {
			const result = this.leafValues.search(leaf.values, start)
			const index =
				result.found !== undefined ? (startOpen ? result.found + 1 : result.found) : result.closest
			startOffset = index
			results.push(...leaf.values.slice(index))
		} else {
			results.push(...leaf.values)
		}

		// End bound in the same leaf.
		if (end !== undefined && this.compareKey(leaf.values[leaf.values.length - 1].key, end) >= 0) {
			const result = this.leafValues.search(leaf.values, end)

			if (result.found !== undefined) {
				const endIndex = endOpen ? result.found - startOffset : result.found + 1 - startOffset
				results.splice(endIndex, results.length)
			} else {
				results.splice(result.closest - startOffset, results.length)
			}

			// End and limit bound
			if (args.limit && results.length >= args.limit) {
				results.splice(args.limit, results.length)
				return results
			}
			return results
		}

		// Limit bound
		if (args.limit && results.length >= args.limit) {
			results.splice(args.limit, results.length)
			return results
		}

		let cursor: NodeCursor<K, V, D> | undefined = startKey
		while ((cursor = this.nextCursor(cursor))) {
			const leaf = cursor.nodePath[0] as LeafNode<K, V, D>

			results.push(...leaf.values)

			// End bound
			if (end !== undefined && this.compareKey(leaf.values[leaf.values.length - 1].key, end) >= 0) {
				const result = this.leafValues.search(results, end)
				if (result.found !== undefined) {
					const endIndex = endOpen ? result.found : result.found + 1
					results.splice(endIndex, results.length)
				} else {
					results.splice(result.closest, results.length)
				}

				// End and limit bound
				if (args.limit && results.length >= args.limit) {
					results.splice(args.limit, results.length)
					return results
				}
				return results
			}

			// Limit bound
			if (args.limit && results.length >= args.limit) {
				results.splice(args.limit, results.length)
				return results
			}
		}

		return results
	}

	reduce(
		args: {
			gt?: K
			gte?: K
			lt?: K
			lte?: K
		} = {}
	) {
		if (args.gt !== undefined && args.gte !== undefined)
			throw new Error("Invalid bounds: {gt, gte}")
		if (args.lt !== undefined && args.lte !== undefined)
			throw new Error("Invalid bounds: {lt, lte}")

		const start = args.gt !== undefined ? args.gt : args.gte !== undefined ? args.gte : undefined
		const startOpen = args.gt !== undefined
		const end = args.lt !== undefined ? args.lt : args.lte !== undefined ? args.lte : undefined
		const endOpen = args.lt !== undefined

		if (start !== undefined && end !== undefined) {
			const comp = this.compareKey(start, end)
			if (comp > 0) {
				throw new Error("Invalid bounds.")
			}
			if (comp === 0 && (startOpen || endOpen)) {
				throw new Error("Invalid open bounds.")
			}
		}

		let startKey: NodeCursor<K, V, D> | undefined
		let endKey: NodeCursor<K, V, D> | undefined
		if (start !== undefined) {
			startKey = this.findPath(start)
		} else {
			startKey = this.startCursor()
		}

		// Empty tree.
		if (startKey.nodePath.length === 0) {
			return
		}

		if (end !== undefined) {
			endKey = this.findPath(end)
		} else {
			endKey = this.endCursor()
		}

		const startLeaf = startKey.nodePath[0] as LeafNode<K, V, D>
		const endLeaf = endKey.nodePath[0] as LeafNode<K, V, D>

		if (startLeaf.id === endLeaf.id) {
			let startIndex = 0
			let endIndex = endLeaf.values.length
			if (start !== undefined) {
				const result = this.leafValues.search(startLeaf.values, start)
				if (result.found !== undefined) {
					startIndex = result.found + (startOpen ? 1 : 0)
				} else {
					startIndex = result.closest
				}
			}
			if (end !== undefined) {
				const result = this.leafValues.search(endLeaf.values, end)
				if (result.found !== undefined) {
					endIndex = result.found + (endOpen ? 0 : 1)
				} else {
					endIndex = result.closest
				}
			}

			const values = startLeaf.values.slice(startIndex, endIndex)
			const data = this.reducer.leaf(values)
			return data
		}

		let startData: D
		if (start !== undefined) {
			const result = this.leafValues.search(startLeaf.values, start)

			let startIndex: number
			if (result.found !== undefined) {
				startIndex = result.found + (startOpen ? 1 : 0)
			} else {
				startIndex = result.closest
			}

			const startValues = startLeaf.values.slice(startIndex)
			startData = this.reducer.leaf(startValues)
		} else {
			startData = startLeaf.data
		}

		let endData: D
		if (end !== undefined) {
			const result = this.leafValues.search(endLeaf.values, end)

			let endIndex: number
			if (result.found !== undefined) {
				endIndex = result.found + (endOpen ? 0 : 1)
			} else {
				endIndex = result.closest
			}

			const endValues = endLeaf.values.slice(0, endIndex)
			endData = this.reducer.leaf(endValues)
		} else {
			endData = endLeaf.data
		}

		for (let i = 1; i < startKey.nodePath.length; i++) {
			const startBranch = startKey.nodePath[i] as BranchNode<K, D>
			const endBranch = endKey.nodePath[i] as BranchNode<K, D>
			const startIndex = startKey.indexPath[i - 1]
			const endIndex = endKey.indexPath[i - 1]

			const startItem = { ...startBranch.children[startIndex], data: startData }
			const endItem = { ...endBranch.children[endIndex], data: endData }

			if (startBranch.id !== endBranch.id) {
				const startRest = startBranch.children.slice(startIndex + 1)
				startData = this.reducer.branch([startItem, ...startRest])
				const endRest = endBranch.children.slice(0, endIndex)
				endData = this.reducer.branch([...endRest, endItem])
				continue
			}

			if (startIndex === endIndex) throw new Error("This shouldn't happen")

			const middleItems = startBranch.children.slice(startIndex + 1, endIndex)
			const resultData = this.reducer.branch([startItem, ...middleItems, endItem])

			return resultData
		}

		throw new Error("This shouldn't happen.")
	}

	set = (key: K, value: V) => {
		const { nodePath, indexPath } = this.findPath(key)

		// Intitalize root node.
		if (nodePath.length === 0) {
			this.nodes.set("root", {
				leaf: true,
				id: "root",
				data: this.reducer.leaf([{ key, value }]),
				values: [{ key, value }],
			})
			return
		}

		// Insert into leaf node.
		const leaf = nodePath[0] as LeafNode<K, V, D>
		this.leafValues.insert(leaf.values, { key, value })

		// Balance the tree by splitting nodes, starting from the leaf.
		let node = nodePath.shift()
		while (node) {
			const size = node.leaf ? node.values.length : node.children.length

			if (size <= this.maxSize) {
				// No splitting, update data.
				if (node.leaf) node.data = this.reducer.leaf(node.values)
				else node.data = this.reducer.branch(node.children)

				// We're at the root.
				if (nodePath.length === 0) break

				// Still need to update the parent data.
				const parent = nodePath.shift() as BranchNode<K, D>
				const parentIndex = indexPath.shift()!
				parent.children[parentIndex].data = node.data
				// Recur
				node = parent
				continue
			}

			const splitIndex = Math.round(size / 2)

			if (node.leaf) {
				// NOTE: this mutates the array!
				const rightValues = node.values.splice(splitIndex)
				const rightNode: LeafNode<K, V, D> = {
					id: randomId(),
					leaf: true,
					data: this.reducer.leaf(rightValues),
					values: rightValues,
				}
				this.nodes.set(rightNode.id, rightNode)
				node.data = this.reducer.leaf(node.values)

				const rightMinKey = rightNode.values[0].key

				if (node.id === "root") {
					const leftNode: LeafNode<K, V, D> = {
						id: randomId(),
						leaf: true,
						// NOTE: this array was mutated above.
						values: node.values,
						data: node.data,
					}
					this.nodes.set(leftNode.id, leftNode)

					const rootNodeChildren: BranchNode<K, D>["children"] = [
						{ minKey: null, childId: leftNode.id, data: leftNode.data },
						{
							minKey: rightNode.values[0].key,
							childId: rightNode.id,
							data: rightNode.data,
						},
					]
					const rootNode: BranchNode<K, D> = {
						id: "root",
						leaf: false,
						children: rootNodeChildren,
						data: this.reducer.branch(rootNodeChildren),
					}
					this.nodes.set("root", rootNode)
					break
				}

				// Insert right node into parent.
				const parent = nodePath.shift() as BranchNode<K, D>
				const parentIndex = indexPath.shift()
				if (!parent) throw new Error("Broken.")
				if (parentIndex === undefined) throw new Error("Broken.")
				parent.children.splice(parentIndex + 1, 0, {
					minKey: rightMinKey,
					data: rightNode.data,
					childId: rightNode.id,
				})
				// Update parent data.
				parent.children[parentIndex].data = node.data

				// Recur
				node = parent
				continue
			}

			// NOTE: this mutates the array!
			const rightChildren = node.children.splice(splitIndex)
			const rightNode: BranchNode<K, D> = {
				id: randomId(),
				children: rightChildren,
				data: this.reducer.branch(rightChildren),
			}
			this.nodes.set(rightNode.id, rightNode)
			node.data = this.reducer.branch(node.children)

			const rightMinKey = rightNode.children[0].minKey

			if (node.id === "root") {
				const leftNode: BranchNode<K, D> = {
					id: randomId(),
					// NOTE: this array was mutated above.
					children: node.children,
					data: node.data,
				}
				this.nodes.set(leftNode.id, leftNode)
				const rootNodeChildren: BranchNode<K, D>["children"] = [
					{ minKey: null, childId: leftNode.id, data: leftNode.data },
					{
						minKey: rightNode.children[0].minKey,
						childId: rightNode.id,
						data: rightNode.data,
					},
				]
				const rootNode: BranchNode<K, D> = {
					id: "root",
					children: rootNodeChildren,
					data: this.reducer.branch(rootNodeChildren),
				}
				this.nodes.set("root", rootNode)
				break
			}

			// Insert right node into parent.
			const parent = nodePath.shift() as BranchNode<K, D>
			const parentIndex = indexPath.shift()
			if (!parent) throw new Error("Broken.")
			if (parentIndex === undefined) throw new Error("Broken.")
			parent.children.splice(parentIndex + 1, 0, {
				minKey: rightMinKey,
				childId: rightNode.id,
				data: rightNode.data,
			})

			// Update parent data.
			parent.children[parentIndex].data = node.data

			// Recur
			node = parent
		}
	}

	delete = (key: K) => {
		const root = this.nodes.get("root")
		if (!root) return

		// Delete from leaf node.
		const nodePath = [root]
		const indexPath: number[] = []
		while (true) {
			const node = nodePath[0]

			if (node.leaf) {
				const exists = this.leafValues.remove(node.values, key)
				if (!exists) return // No changes to the tree!
				break
			}

			// Recur into the child.
			const result = this.branchChildren.search(node.children, key)
			const index = result.found !== undefined ? result.found : result.closest - 1
			const childId = node.children[index].childId
			const child = this.nodes.get(childId)
			if (!child) throw Error("Missing child node.")
			nodePath.unshift(child)
			indexPath.unshift(index)
		}

		// Merge or redistribute to maintain minSize.
		let node = nodePath.shift()
		while (node) {
			if (node.leaf) {
				node.data = this.reducer.leaf(node.values)
			} else {
				node.data = this.reducer.branch(node.children)
			}

			if (node.id === "root") {
				// A root leaf node has no minSize constaint.
				if (node.leaf) return

				// Cleanup an empty root node.
				if (node.children.length === 0) {
					this.nodes.delete("root")
					return
				}

				// A root node with one child becomes its child.
				if (node.children.length === 1) {
					const childId = node.children[0].childId
					const childNode = this.nodes.get(childId)
					if (!childNode) throw new Error("Broken.")
					this.nodes.set("root", { ...childNode, id: "root" })
					this.nodes.delete(childId)
				}

				return
			}

			const parent = nodePath.shift() as BranchNode<K, D>
			const parentIndex = indexPath.shift()
			if (!parent) throw new Error("Broken.")
			if (parentIndex === undefined) throw new Error("Broken.")

			const size = node.leaf ? node.values.length : node.children.length
			const minKey = node.leaf ? node.values[0].key : node.children[0].minKey

			let dataUpdated = false
			const parentCount = parent.children[parentIndex].data
			if (parentCount !== node.data) {
				dataUpdated = true
				parent.children[parentIndex].data = node.data
			}

			// No need to merge but we might need to update the minKey in the parent
			let minKeyUpdated = false
			if (size >= this.minSize) {
				const parentItem = parent.children[parentIndex]
				// No need to recusively update the left-most branch.
				// No need to recursively update if the minKey didn't change.
				if (parentItem.minKey !== null && this.compareBranchKey(parentItem.minKey, minKey) !== 0) {
					// Set the minKey
					minKeyUpdated = true
					parentItem.minKey = minKey
				}

				if (!minKeyUpdated && !dataUpdated) {
					return
				}

				// Recur
				node = parent
				continue
			}

			// Merge or redistribute leaf nodes.
			if (node.leaf) {
				if (parentIndex === 0) {
					const rightId = parent.children[parentIndex + 1].childId
					const rightSibling = this.nodes.get(rightId) as typeof node
					if (!rightSibling) throw new Error("Broken.")

					const combinedSize = node.values.length + rightSibling.values.length

					// Redistribute leaf.
					if (combinedSize > this.maxSize) {
						const splitIndex = Math.round(combinedSize / 2) - node.values.length
						// NOTE: this mutates the array!
						const moveLeft = rightSibling.values.splice(0, splitIndex)
						node.values.push(...moveLeft)

						node.data = this.reducer.leaf(node.values)
						rightSibling.data = this.reducer.leaf(rightSibling.values)

						// Update parent minKey.
						if (parent.children[parentIndex].minKey !== null) {
							const leftMinKey = node.values[0].key
							parent.children[parentIndex].minKey = leftMinKey
						}
						const rightMinKey = rightSibling.values[0].key
						parent.children[parentIndex + 1].minKey = rightMinKey

						// Update parent data
						parent.children[parentIndex].data = node.data
						parent.children[parentIndex + 1].data = rightSibling.data

						// Recur
						node = parent
						continue
					}

					// Merge leaves.
					node.values.push(...rightSibling.values)
					node.data = this.reducer.leaf(node.values)

					// Delete rightSibling
					parent.children.splice(1, 1)
					this.nodes.delete(rightSibling.id)
					// Update parent minKey
					const leftMost = parent.children[0].minKey === null
					const minKey = leftMost ? null : node.values[0].key
					parent.children[0].minKey = minKey
					// Update parent data
					parent.children[0].data = node.data

					// Recur
					node = parent
					continue
				}

				const leftId = parent.children[parentIndex - 1].childId
				const leftSibling = this.nodes.get(leftId) as typeof node
				if (!leftSibling) throw new Error("Broken.")

				const combinedSize = leftSibling.values.length + node.values.length
				// Redistribute leaf.
				if (combinedSize > this.maxSize) {
					const splitIndex = Math.round(combinedSize / 2)

					const moveRight = leftSibling.values.splice(splitIndex, this.maxSize)
					node.values.unshift(...moveRight)

					leftSibling.data = this.reducer.leaf(leftSibling.values)
					node.data = this.reducer.leaf(node.values)

					// Update parent minKey.
					parent.children[parentIndex].minKey = node.values[0].key

					parent.children[parentIndex].data = node.data
					parent.children[parentIndex - 1].data = leftSibling.data

					// Recur
					node = parent
					continue
				}

				// Merge leaf.
				leftSibling.values.push(...node.values)
				leftSibling.data = this.reducer.leaf(leftSibling.values)

				// Delete the node
				parent.children.splice(parentIndex, 1)
				this.nodes.delete(node.id)
				// No need to update minKey because we added to the right.

				parent.children[parentIndex - 1].data = leftSibling.data

				// Recur
				node = parent
				continue
			}

			// Merge or redistribute branch nodes.
			if (parentIndex === 0) {
				const rightId = parent.children[parentIndex + 1].childId
				const rightSibling = this.nodes.get(rightId) as typeof node
				if (!rightSibling) throw new Error("Broken.")

				const combinedSize = node.children.length + rightSibling.children.length

				// Redistribute leaf.
				if (combinedSize > this.maxSize) {
					const splitIndex = Math.round(combinedSize / 2) - node.children.length
					// NOTE: this mutates the array!
					const moveLeft = rightSibling.children.splice(0, splitIndex)
					node.children.push(...moveLeft)

					rightSibling.data = this.reducer.branch(rightSibling.children)
					node.data = this.reducer.branch(node.children)

					// Update parent minKey.
					if (parent.children[parentIndex].minKey !== null) {
						const leftMinKey = node.children[0].minKey
						parent.children[parentIndex].minKey = leftMinKey
					}
					const rightMinKey = rightSibling.children[0].minKey
					parent.children[parentIndex + 1].minKey = rightMinKey

					// Update parent count
					parent.children[parentIndex].data = node.data
					parent.children[parentIndex + 1].data = rightSibling.data

					// Recur
					node = parent
					continue
				}

				// Merge leaves.
				node.children.push(...rightSibling.children)
				node.data = this.reducer.branch(node.children)

				// Delete rightSibling
				parent.children.splice(1, 1)
				this.nodes.delete(rightSibling.id)

				// Update parent minKey
				const leftMost = parent.children[0].minKey === null
				const minKey = leftMost ? null : node.children[0].minKey
				parent.children[0].minKey = minKey

				parent.children[0].data = node.data

				// Recur
				node = parent
				continue
			}

			const leftId = parent.children[parentIndex - 1].childId
			const leftSibling = this.nodes.get(leftId) as typeof node
			if (!leftSibling) throw new Error("Broken.")

			const combinedSize = leftSibling.children.length + node.children.length

			// Redistribute leaf.
			if (combinedSize > this.maxSize) {
				const splitIndex = Math.round(combinedSize / 2)

				const moveRight = leftSibling.children.splice(splitIndex, this.maxSize)
				node.children.unshift(...moveRight)

				leftSibling.data = this.reducer.branch(leftSibling.children)
				node.data = this.reducer.branch(node.children)

				// Update parent minKey.
				parent.children[parentIndex].minKey = node.children[0].minKey

				parent.children[parentIndex].data = node.data
				parent.children[parentIndex - 1].data = leftSibling.data

				// Recur
				node = parent
				continue
			}

			// Merge leaf.
			leftSibling.children.push(...node.children)
			leftSibling.data = this.reducer.branch(leftSibling.children)

			// Delete the node
			parent.children.splice(parentIndex, 1)
			this.nodes.delete(node.id)
			// No need to update minKey because we added to the right.

			parent.children[parentIndex - 1].data = leftSibling.data

			// Recur
			node = parent
			continue
		}
	}
}

function randomId() {
	return Math.random().toString(36).slice(2, 10)
}
