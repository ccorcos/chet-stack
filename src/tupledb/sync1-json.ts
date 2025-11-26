/*

Sync arbitrary JSON structures.
- logical clock for causality.
- central server authority on transaction ordering, last-write-wins
- supports nested operations via paths

Problems that we will ignore for now:
- idempotency of writes
- concurrent calls to sync

Benefits:
- we can ignore history before the last sync.
- unified operations for counter, map, and array

Operations use paths (string arrays) to target nested values:
- ["users", "alice", "age"] targets value.users.alice.age
- ["messages", 0] targets value.messages[0]

*/

type Path = (string | number)[]

type Op =
	| { type: "set"; path: Path; value: any }
	| { type: "delete"; path: Path }
	| { type: "increment"; path: Path; value: number }
	| { type: "push"; path: Path; value: any }
	| { type: "insert"; path: Path; index: number; value: any }
	| { type: "arrayDelete"; path: Path; index: number }
	| { type: "arraySet"; path: Path; index: number; value: any }

function getPath(obj: any, path: Path): any {
	let current = obj
	for (const key of path) {
		if (current === undefined || current === null) return undefined
		current = current[key]
	}
	return current
}

function setPath(obj: any, path: Path, value: any): void {
	if (path.length === 0) {
		throw new Error("Cannot set empty path")
	}

	let current = obj
	for (let i = 0; i < path.length - 1; i++) {
		const key = path[i]
		if (current[key] === undefined || current[key] === null) {
			// Auto-create objects or arrays based on next key type
			const nextKey = path[i + 1]
			current[key] = typeof nextKey === "number" ? [] : {}
		}
		current = current[key]
	}

	const lastKey = path[path.length - 1]
	current[lastKey] = value
}

function deletePath(obj: any, path: Path): void {
	if (path.length === 0) {
		throw new Error("Cannot delete empty path")
	}

	let current = obj
	for (let i = 0; i < path.length - 1; i++) {
		const key = path[i]
		if (current === undefined || current === null) return
		current = current[key]
	}

	if (current !== undefined && current !== null) {
		const lastKey = path[path.length - 1]
		if (Array.isArray(current)) {
			current.splice(lastKey as number, 1)
		} else {
			delete current[lastKey]
		}
	}
}

function deepClone(obj: any): any {
	if (obj === null || typeof obj !== "object") return obj
	if (Array.isArray(obj)) return obj.map(deepClone)
	const cloned: any = {}
	for (const key in obj) {
		cloned[key] = deepClone(obj[key])
	}
	return cloned
}

export function json() {
	return {
		clock: 0,
		value: {} as any,
		history: [] as Op[],

		set(path: Path, value: any) {
			const clock = this.clock
			this.history[clock] = { type: "set", path, value }
			setPath(this.value, path, value)
			this.clock += 1
		},

		delete(path: Path) {
			const clock = this.clock
			this.history[clock] = { type: "delete", path }
			deletePath(this.value, path)
			this.clock += 1
		},

		increment(path: Path, value: number) {
			const clock = this.clock
			this.history[clock] = { type: "increment", path, value }
			const current = getPath(this.value, path) || 0
			setPath(this.value, path, current + value)
			this.clock += 1
		},

		push(path: Path, value: any) {
			const clock = this.clock
			this.history[clock] = { type: "push", path, value }
			const arr = getPath(this.value, path)
			if (Array.isArray(arr)) {
				arr.push(value)
			} else {
				setPath(this.value, path, [value])
			}
			this.clock += 1
		},

		insert(path: Path, index: number, value: any) {
			const clock = this.clock
			this.history[clock] = { type: "insert", path, index, value }
			const arr = getPath(this.value, path)
			if (Array.isArray(arr)) {
				arr.splice(index, 0, value)
			} else {
				setPath(this.value, path, [value])
			}
			this.clock += 1
		},

		arrayDelete(path: Path, index: number) {
			const clock = this.clock
			this.history[clock] = { type: "arrayDelete", path, index }
			const arr = getPath(this.value, path)
			if (Array.isArray(arr)) {
				arr.splice(index, 1)
			}
			this.clock += 1
		},

		arraySet(path: Path, index: number, value: any) {
			const clock = this.clock
			this.history[clock] = { type: "arraySet", path, index, value }
			const arr = getPath(this.value, path)
			if (Array.isArray(arr)) {
				arr[index] = value
			}
			this.clock += 1
		},

		write(ops: Op[]) {
			const start = this.clock
			for (const op of ops) {
				if (op.type === "set") {
					this.set(op.path, op.value)
				} else if (op.type === "delete") {
					this.delete(op.path)
				} else if (op.type === "increment") {
					this.increment(op.path, op.value)
				} else if (op.type === "push") {
					this.push(op.path, op.value)
				} else if (op.type === "insert") {
					this.insert(op.path, op.index, op.value)
				} else if (op.type === "arrayDelete") {
					this.arrayDelete(op.path, op.index)
				} else if (op.type === "arraySet") {
					this.arraySet(op.path, op.index, op.value)
				}
			}
			return start
		},
	}
}

const server = {
	json: json(),
	sync(clock: number, ops: Op[]) {
		this.json.write(ops)
		return this.json.history.slice(clock)
	},
}

function client() {
	return {
		remote: json(),
		local: json(),

		set(path: Path, value: any) {
			this.local.set(path, value)
			return this.sync()
		},

		delete(path: Path) {
			this.local.delete(path)
			return this.sync()
		},

		increment(path: Path, value: number) {
			this.local.increment(path, value)
			return this.sync()
		},

		push(path: Path, value: any) {
			this.local.push(path, value)
			return this.sync()
		},

		insert(path: Path, index: number, value: any) {
			this.local.insert(path, index, value)
			return this.sync()
		},

		arrayDelete(path: Path, index: number) {
			this.local.arrayDelete(path, index)
			return this.sync()
		},

		arraySet(path: Path, index: number, value: any) {
			this.local.arraySet(path, index, value)
			return this.sync()
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
			this.local.value = deepClone(this.remote.value)
			this.local.history = [...this.remote.history]
			this.local.write(rest)
		},
	}
}

// Think about...
// - pubsub for the clock -> call client.sync()
// - better conflict resolution strategies
// - optimistic UI updates
// - handling deep paths efficiently
