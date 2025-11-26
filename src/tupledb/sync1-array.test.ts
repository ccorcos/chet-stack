import { describe, it } from "mocha"
import assert from "assert"

type Op =
	| { type: "insert"; index: number; value: any }
	| { type: "delete"; index: number }
	| { type: "push"; value: any }
	| { type: "set"; index: number; value: any }

function array() {
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

describe("sync1-array", () => {
	it("syncs push operations", async () => {
		server.array = array()
		const c1 = client()

		await c1.push("a")
		await c1.push("b")
		await c1.push("c")

		assert.deepEqual(c1.local.value, ["a", "b", "c"])
		assert.deepEqual(c1.remote.value, ["a", "b", "c"])
		assert.deepEqual(server.array.value, ["a", "b", "c"])
	})

	it("syncs insert operations", async () => {
		server.array = array()
		const c1 = client()

		await c1.push("a")
		await c1.push("c")
		await c1.insert(1, "b")

		assert.deepEqual(c1.local.value, ["a", "b", "c"])
		assert.deepEqual(c1.remote.value, ["a", "b", "c"])
		assert.deepEqual(server.array.value, ["a", "b", "c"])
	})

	it("syncs delete operations", async () => {
		server.array = array()
		const c1 = client()

		await c1.push("a")
		await c1.push("b")
		await c1.push("c")
		await c1.delete(1)

		assert.deepEqual(c1.local.value, ["a", "c"])
		assert.deepEqual(c1.remote.value, ["a", "c"])
		assert.deepEqual(server.array.value, ["a", "c"])
	})

	it("syncs set operations", async () => {
		server.array = array()
		const c1 = client()

		await c1.push("a")
		await c1.push("b")
		await c1.push("c")
		await c1.set(1, "B")

		assert.deepEqual(c1.local.value, ["a", "B", "c"])
		assert.deepEqual(c1.remote.value, ["a", "B", "c"])
		assert.deepEqual(server.array.value, ["a", "B", "c"])
	})

	it("syncs between two clients", async () => {
		server.array = array()
		const c1 = client()
		const c2 = client()

		await c1.push("a")
		await c1.push("b")
		await c2.sync()

		assert.deepEqual(c1.local.value, ["a", "b"])
		assert.deepEqual(c2.local.value, ["a", "b"])
		assert.deepEqual(server.array.value, ["a", "b"])
	})

	it("handles sequential edits from multiple clients", async () => {
		server.array = array()
		const c1 = client()
		const c2 = client()

		await c1.push("a")
		await c2.sync()
		await c2.push("b")
		await c1.sync()
		await c1.push("c")

		assert.deepEqual(c1.local.value, ["a", "b", "c"])
		assert.deepEqual(server.array.value, ["a", "b", "c"])

		await c2.sync()
		assert.deepEqual(c2.local.value, ["a", "b", "c"])
	})

	it("handles complex array operations", async () => {
		server.array = array()
		const c1 = client()

		await c1.push("a")
		await c1.push("b")
		await c1.push("c")
		await c1.insert(0, "start")
		await c1.delete(2)
		await c1.set(1, "A")

		assert.deepEqual(c1.local.value, ["start", "A", "c"])
		assert.deepEqual(server.array.value, ["start", "A", "c"])
	})
})
