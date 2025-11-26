import { describe, it } from "mocha"
import assert from "assert"

type Op = { type: "set"; key: string; value: any } | { type: "delete"; key: string }

function map() {
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

describe("sync1-map", () => {
	it("syncs a simple set operation", async () => {
		server.map = map()
		const c1 = client()

		await c1.set("name", "Alice")

		assert.equal(c1.local.value.get("name"), "Alice")
		assert.equal(c1.remote.value.get("name"), "Alice")
		assert.equal(server.map.value.get("name"), "Alice")
	})

	it("syncs multiple keys", async () => {
		server.map = map()
		const c1 = client()

		await c1.set("name", "Alice")
		await c1.set("age", 30)
		await c1.set("city", "NYC")

		assert.equal(c1.local.value.get("name"), "Alice")
		assert.equal(c1.local.value.get("age"), 30)
		assert.equal(c1.local.value.get("city"), "NYC")
		assert.equal(server.map.value.get("name"), "Alice")
		assert.equal(server.map.value.get("age"), 30)
		assert.equal(server.map.value.get("city"), "NYC")
	})

	it("syncs delete operations", async () => {
		server.map = map()
		const c1 = client()

		await c1.set("name", "Alice")
		await c1.set("age", 30)
		await c1.delete("age")

		assert.equal(c1.local.value.get("name"), "Alice")
		assert.equal(c1.local.value.has("age"), false)
		assert.equal(server.map.value.get("name"), "Alice")
		assert.equal(server.map.value.has("age"), false)
	})

	it("syncs between two clients", async () => {
		server.map = map()
		const c1 = client()
		const c2 = client()

		await c1.set("name", "Alice")
		await c2.sync()

		assert.equal(c1.local.value.get("name"), "Alice")
		assert.equal(c2.local.value.get("name"), "Alice")
		assert.equal(server.map.value.get("name"), "Alice")
	})

	it("handles last-write-wins conflict resolution", async () => {
		server.map = map()
		const c1 = client()
		const c2 = client()

		await c1.set("name", "Alice")
		await c2.sync()
		await c2.set("name", "Bob")
		await c1.sync()

		assert.equal(c1.local.value.get("name"), "Bob")
		assert.equal(c2.local.value.get("name"), "Bob")
		assert.equal(server.map.value.get("name"), "Bob")
	})
})
