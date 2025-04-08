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

import { strict as assert } from "assert"
import { describe, it } from "mocha"
import { codec } from "./Codec"
import { Indexable } from "./Indexing"
import { InMemoryBaseOKV } from "./InMemoryBaseOKV"
import { tupleSugar } from "./okv"

type Person = {
	id: string
	first?: string
	last?: string
	birthday?: string
	phone?: { number?: string; label?: string }[]
	email?: { address?: string; label?: string }[]
}

// Example person data for testing
const example: Person[] = [
	{
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
	},
	{
		id: "p2",
		first: "Jane",
		last: "Smith",
		birthday: "1985-10-20",
		phone: [{ number: "555-222-3333", label: "mobile" }],
		email: [{ address: "jane.smith@example.com", label: "personal" }],
	},
	{
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
	},
	{
		id: "p4",
		first: "Emily",
		last: "Davis",
		birthday: "1990-12-25",
		phone: [{ number: "555-888-9999", label: "mobile" }],
		email: [
			{ address: "emily.davis@example.com", label: "personal" },
			{ address: "edavis@school.edu", label: "school" },
		],
	},
]

describe("Indexing", () => {
	it("seconary index", () => {
		const db = tupleSugar(new InMemoryBaseOKV(codec.compare))
		const { createIndex } = Indexable(db)

		createIndex({
			id: "lastfirst",
			order: 0,
			range: { gt: ["person"], lte: ["person", null, null, null, null] },
			set: (db, key, value) => {
				if (value.last === undefined || value.first === undefined) return
				db.set(["lastfirst", value.last, value.first, value.id], null)
			},
			delete: (db, key) => {
				const value = db.get(key)
				if (value.last === undefined || value.first === undefined) return
				db.delete(["lastfirst", value.last, value.first, value.id])
			},
		})

		createIndex({
			id: "email",
			order: 0,
			range: { gt: ["email"], lte: ["email", null, null, null, null] },
			set: (db, key, value) => {
				if (value.email === undefined || value.email.length === 0) return
				for (const { address } of value.email) {
					if (address === undefined) continue
					db.set(["email", address, value.id], key)
				}
			},
			delete: (db, key) => {
				const value = db.get(key)
				if (value.email === undefined || value.email.length === 0) return
				for (const { address } of value.email) {
					if (address === undefined) continue
					db.delete(["email", address, value.id])
				}
			},
		})

		// Running indexes manually here.
		for (const person of example) {
			db.set(["person", person.id], person)
		}

		const p1 = example[0]
		db.delete(["person", p1.id])

		console.log(db.list())
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

		const db = tupleSugar(new InMemoryBaseOKV(codec.compare))
		const { createIndex } = Indexable(db)

		// Secondary indexes

		createIndex({
			id: "userPosts",
			order: 0,
			range: { gt: ["post"], lte: ["post", null, null, null, null] },
			set: (db, key, value) => {
				if (value.author_id === undefined) return
				db.set(["userPosts", value.author_id, value.created_at, value.id], null)
			},
			delete: (db, key) => {
				const value = db.get(key)
				if (value.author_id === undefined) return
				db.delete(["userPosts", value.author_id, value.created_at, value.id])
			},
		})

		createIndex({
			id: "followedBy",
			order: 0,
			range: { gt: ["follow"], lte: ["follow", null, null, null, null] },
			set: (db, key, value) => {
				const { from, to } = value
				db.set(["followedBy", to, from], value)
			},
			delete: (db, key) => {
				const value = db.get(key)
				const { from, to } = value
				db.delete(["followedBy", to, from])
			},
		})

		// Tertiary indexes AKA fanout indexdes.
		createIndex({
			id: "followToTimline",
			order: 1,
			range: { gt: ["follow"], lte: ["follow", null, null, null, null] },
			set: (db, key, value) => {
				const { from, to } = value
				// Insert all posts from the user into the timeline.
				for (const { key } of db.prefix(["userPosts", to])) {
					const [_indexName, _authorId, createdAt, postId] = key
					db.set(["timeline", from, createdAt, postId], null)
				}
			},
			delete: (db, key) => {
				const value = db.get(key)
				const { from, to } = value
				// Delete all posts from the user into the timeline.
				for (const { key } of db.prefix(["userPosts", to])) {
					const [_indexName, _authorId, createdAt, postId] = key
					db.delete(["timeline", from, createdAt, postId])
				}
			},
		})

		createIndex({
			id: "postToTimeline",
			order: 1,
			range: { gt: ["post"], lte: ["post", null, null, null, null] },
			set: (db, key, value) => {
				// Insert post into all followees' timelines.
				const { author_id, created_at, id } = value
				for (const { key } of db.prefix(["followedBy", author_id])) {
					const [_indexName, _to, from] = key
					db.set(["timeline", from, created_at, id], null)
				}
			},
			delete: (db, key) => {
				const value = db.get(key)
				// Delete post from all followees' timelines.
				const { author_id, created_at, id } = value
				for (const { key } of db.prefix(["followedBy", author_id])) {
					const [_indexName, _to, from] = key
					db.delete(["timeline", from, created_at, id])
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
			assert.equal(db.prefix(["userPosts", id]).length, 2)
			// No follows so empty timelines.
			assert.equal(db.prefix(["timeline", id]).length, 0)
		}

		// Create a follow should add to the timeline index.
		const follow12: Follow = { id: ["u1", "u2"], from: "u1", to: "u2" }
		db.set(["follow", follow12.id], follow12)
		assert.equal(db.prefix(["timeline", "u1"]).length, 2)

		// Create another follow
		const follow13: Follow = { id: ["u1", "u3"], from: "u1", to: "u3" }
		db.set(["follow", follow13.id], follow13)
		assert.equal(db.prefix(["timeline", "u1"]).length, 4)

		// Remove that first follow.
		// IMPORTANT: need to run tertiary index updates before secondary updates before primary updates.
		db.delete(["follow", follow12.id])
		assert.equal(db.prefix(["timeline", "u1"]).length, 2)
	})
})
