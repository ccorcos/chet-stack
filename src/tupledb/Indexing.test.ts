/*

Simpler approach to indexing.
Primary Records -> Secondary Indexes
Secondary Indexes -> Tertiary Indexes


examples...
- contacts
- chat app
- twitter
- airtable filters.

*/

import { describe, it } from "mocha"
import { strict as assert } from "node:assert"
import { codec } from "./Codec"
import { Indexable } from "./Indexing"
import { InMemoryOkv } from "./InMemoryOkv"
import { tupleDb } from "./TupleDb"

type Person = {
	id: string
	first?: string
	last?: string
	birthday?: string
	phone?: { number?: string; label?: string }[]
	email?: { address?: string; label?: string }[]
}

const john: Person = {
	id: "p1",
	first: "John",
	last: "Doe",
	birthday: "1980-05-15",
	phone: [
		{ number: "555-123-4567", label: "mobile" },
		{ number: "555-987-6543", label: "work" },
	],
	email: [
		{ address: "john.doe@example.com", label: "personal" },
		{ address: "jdoe@work.com", label: "work" },
	],
}
const jane: Person = {
	id: "p2",
	first: "Jane",
	last: "Smith",
	birthday: "1985-10-20",
	phone: [{ number: "555-222-3333", label: "mobile" }],
	email: [{ address: "jane.smith@example.com", label: "personal" }],
}
const robert: Person = {
	id: "p3",
	first: "Robert",
	last: "Johnson",
	birthday: "1975-03-08",
	phone: [
		{ number: "555-444-5555", label: "home" },
		{ number: "555-666-7777", label: "work" },
	],
	email: [
		{ address: "robert.j@example.com", label: "personal" },
		{ address: "rjohnson@company.com", label: "work" },
	],
}
const emily: Person = {
	id: "p4",
	first: "Emily",
	last: "Davis",
	birthday: "1990-12-25",
	phone: [{ number: "555-888-9999", label: "mobile" }],
	email: [
		{ address: "emily.davis@example.com", label: "personal" },
		{ address: "edavis@school.edu", label: "school" },
	],
}

// Example person data for testing
const example: Person[] = [john, jane, robert, emily]

describe("Indexing", () => {
	it("seconary index", () => {
		const { createIndex, deleteIndex, ...base } = Indexable(new InMemoryOkv(codec.compare))
		const db = tupleDb(base)

		db.set(["person", john.id], john)

		createIndex({
			id: "lastfirst",
			order: 0,
			range: { gt: ["person"], lt: ["person", null] },
			set: (tx, key, value) => {
				if (value.last === undefined || value.first === undefined) return
				tx.set(["lastfirst", value.last, value.first, value.id], null)
			},
			delete: (tx, key) => {
				const value = tx.get(key)
				if (value.last === undefined || value.first === undefined) return
				tx.delete(["lastfirst", value.last, value.first, value.id])
			},
		})

		// Index was built
		assert.deepEqual(db.list(), [
			{ key: ["lastfirst", john.last, john.first, john.id], value: null },
			{ key: ["person", john.id], value: john },
		])

		// Index is maintained
		db.set(["person", jane.id], jane)
		assert.deepEqual(db.list(), [
			{ key: ["lastfirst", john.last, john.first, john.id], value: null },
			{ key: ["lastfirst", jane.last, jane.first, jane.id], value: null },
			{ key: ["person", john.id], value: john },
			{ key: ["person", jane.id], value: jane },
		])

		db.delete(["person", john.id])
		assert.deepEqual(db.list(), [
			{ key: ["lastfirst", jane.last, jane.first, jane.id], value: null },
			{ key: ["person", jane.id], value: jane },
		])

		// Cleanup the index when deleting.
		deleteIndex("lastfirst")
		assert.deepEqual(db.list(), [{ key: ["person", jane.id], value: jane }])

		// TODO: test the whole transaction write with the indexes in there all at once.
	})

	it("tertiary index", () => {
		type User = {
			id: string
			name: string
		}

		type Follow = {
			id: [string, string]
			from: string
			to: string
		}

		type Post = {
			id: string
			author_id: string
			created_at: string
			content: string
		}

		const { createIndex, deleteIndex, ...base } = Indexable(new InMemoryOkv(codec.compare))
		const db = tupleDb(base)

		// Secondary indexes
		createIndex({
			id: "userPosts",
			order: 0,
			range: { gt: ["post"], lt: ["post", null] },
			set: (tx, key, value) => {
				if (value.author_id === undefined) return
				tx.set(["userPosts", value.author_id, value.created_at, value.id], null)
			},
			delete: (tx, key) => {
				const value = tx.get(key)
				if (value.author_id === undefined) return
				tx.delete(["userPosts", value.author_id, value.created_at, value.id])
			},
		})

		createIndex({
			id: "followedBy",
			order: 0,
			range: { gt: ["follow"], lt: ["follow", null] },
			set: (tx, key, value) => {
				const { from, to } = value
				tx.set(["followedBy", to, from], value)
			},
			delete: (tx, key) => {
				const value = tx.get(key)
				const { from, to } = value
				tx.delete(["followedBy", to, from])
			},
		})

		// Tertiary indexes AKA fanout indexdes.
		createIndex({
			id: "followToTimline",
			order: 1,
			range: { gt: ["follow"], lt: ["follow", null] },
			set: (tx, key, value) => {
				const { from, to } = value
				// Insert all posts from the user into the timeline.
				for (const { key } of tx.subspace(["userPosts", to]).list()) {
					const [createdAt, postId] = key
					tx.set(["timeline", from, createdAt, postId], null)
				}
			},
			delete: (tx, key) => {
				const value = tx.get(key)
				const { from, to } = value
				// Delete all posts from the user into the timeline.
				for (const { key } of tx.subspace(["userPosts", to]).list()) {
					const [createdAt, postId] = key
					tx.delete(["timeline", from, createdAt, postId])
				}
			},
		})

		createIndex({
			id: "postToTimeline",
			order: 1,
			range: { gt: ["post"], lt: ["post", null] },
			set: (tx, key, value) => {
				// Insert post into all followees' timelines.
				const { author_id, created_at, id } = value
				for (const { key, value } of tx.subspace(["followedBy", author_id]).list()) {
					const { from } = value
					tx.set(["timeline", from, created_at, id], null)
				}
			},
			delete: (tx, key) => {
				const value = tx.get(key)
				// Delete post from all followees' timelines.
				const { author_id, created_at, id } = value
				for (const { key, value } of tx.subspace(["followedBy", author_id]).list()) {
					const { from } = value
					tx.delete(["timeline", from, created_at, id])
				}
			},
		})

		// Create three users
		const users: User[] = [
			{ id: "u1", name: "User One" },
			{ id: "u2", name: "User Two" },
			{ id: "u3", name: "User Three" },
		]

		// Two posts per user.
		const posts: Post[] = []
		for (const user of users) {
			for (let i = 0; i < 2; i++) {
				posts.push({
					id: `post${i}_${user.id}`,
					author_id: user.id,
					content: `Post ${i} from ${user.name}`,
					created_at: new Date("2023-01-01").toISOString(),
				})
			}
		}

		for (const user of users) db.set(["person", user.id], user)
		for (const post of posts) {
			db.set(["post", post.id], post)
		}

		for (const { id } of users) {
			// Two posts per user.
			assert.equal(db.subspace(["userPosts", id]).list().length, 2)
			// No follows so empty timelines.
			assert.equal(db.subspace(["timeline", id]).list().length, 0)
		}

		// Create a follow should add to the timeline index.
		const follow12: Follow = { id: ["u1", "u2"], from: "u1", to: "u2" }
		db.set(["follow", follow12.id], follow12)
		assert.equal(db.subspace(["timeline", "u1"]).list().length, 2)

		// Create another follow
		const follow13: Follow = { id: ["u1", "u3"], from: "u1", to: "u3" }
		db.set(["follow", follow13.id], follow13)
		assert.equal(db.subspace(["timeline", "u1"]).list().length, 4)

		// Remove that first follow.
		// It's important that the tertiary index updates run before secondary updates for this to work.
		db.delete(["follow", follow12.id])
		assert.equal(db.subspace(["timeline", "u1"]).list().length, 2)
	})
})
