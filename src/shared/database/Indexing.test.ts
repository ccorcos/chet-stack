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
import { codec, MAX, MIN, prefixScan } from "./Codec"
import { InMemoryDatabase } from "./InMemoryDatabase"
import { ListArgs, OrderedKeyValueApi } from "./types"

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

type Index<K = any, V = any> = {
	range: ListArgs<K>
	update: (
		db: OrderedKeyValueApi<K, V>,
		inserted: { key: K; value: V }[],
		removed: { key: K; value: V }[]
	) => void
}

describe("Indexing", () => {
	it("seconary index", () => {
		const lastFirstIndex: Index = {
			range: { gt: ["person", MIN], lt: ["person", MAX] },
			update: (db, inserted, removed) => {
				for (const { key, value } of removed) {
					if (value.last === undefined || value.first === undefined) continue
					db.delete(["lastfirst", value.last, value.first, value.id])
				}
				for (const { key, value } of inserted) {
					if (value.last === undefined || value.first === undefined) continue
					db.set(["lastfirst", value.last, value.first, value.id], key)
				}
			},
		}

		const emailIndex: Index = {
			range: { gt: ["email", MIN], lt: ["email", MAX] },
			update: (db, inserted, removed) => {
				for (const { key, value } of removed) {
					if (value.email === undefined || value.email.length === 0) continue
					for (const { address } of value.email) {
						if (address === undefined) continue
						db.delete(["email", address, value.id])
					}
				}
				for (const { key, value } of inserted) {
					if (value.email === undefined || value.email.length === 0) continue
					for (const { address } of value.email) {
						if (address === undefined) continue
						db.set(["email", address, value.id], key)
					}
				}
			},
		}

		const db = new InMemoryDatabase(codec.compare)

		// Running indexes manually here.
		for (const person of example) {
			db.set(["person", person.id], person)
			lastFirstIndex.update(db, [{ key: ["person", person.id], value: person }], [])
			emailIndex.update(db, [{ key: ["person", person.id], value: person }], [])
		}

		const p1 = example[0]
		db.delete(["person", p1.id])
		lastFirstIndex.update(db, [{ key: ["person", p1.id], value: p1 }], [])
		emailIndex.update(db, [{ key: ["person", p1.id], value: p1 }], [])

		console.log(db.list())
	})

	it("tertiary index", () => {
		type User = {
			id: string
			name: string
		}

		type Follow = {
			id: [string, string]
		}

		type Post = {
			id: string
			author_id: string
			created_at: string
			content: string
		}

		// Secondary indexes
		const userPostsIndex: Index<any, any> = {
			range: { gt: ["post", MIN], lt: ["post", MAX] },
			update: (db, inserted, removed) => {
				for (const { key, value } of removed) {
					db.delete(["userPosts", value.author_id, value.created_at, value.id])
				}
				for (const { key, value } of inserted) {
					db.set(["userPosts", value.author_id, value.created_at, value.id], value.id)
				}
			},
		}

		const followedByIndex: Index<any, any> = {
			range: { gt: ["follow", MIN], lt: ["follow", MAX] },
			update: (db, inserted, removed) => {
				for (const { key, value } of removed) {
					const [from, to] = value.id
					db.delete(["followedBy", [to, from]])
				}
				for (const { key, value } of inserted) {
					const [from, to] = value.id
					db.set(["followedBy", [to, from]], from)
				}
			},
		}

		// Tertiary indexes
		const followToTimlineIndex: Index<any, any> = {
			range: { gt: ["follow", MIN], lt: ["follow", MAX] },
			update: (db, inserted, removed) => {
				for (const { key, value } of removed) {
					const [from, to] = value.id
					// Delete all posts from the user into the timeline.
					db.list(prefixScan(["userPosts", to])).map(({ key: [_0, _1, createdAt, postId] }) => {
						db.delete(["timeline", from, createdAt, postId])
					})
				}
				for (const { key, value } of inserted) {
					const [from, to] = value.id
					// Insert all posts from the user into the timeline.
					db.list(prefixScan(["userPosts", to])).map(({ key: [_0, _1, createdAt, postId] }) => {
						db.set(["timeline", from, createdAt, postId], to)
					})
				}
			},
		}

		const postToTimelineIndex: Index<any, any> = {
			range: { gt: ["post", MIN], lt: ["post", MAX] },
			update: (db, inserted, removed) => {
				for (const { key, value } of removed) {
					// Delete post from all followees' timelines.
					db.list(prefixScan(["followedBy", value.author_id])).map(({ value: from }) => {
						db.delete(["timeline", from, value.created_at, value.id])
					})
				}
				for (const { key, value } of inserted) {
					// Insert post into all followees' timelines.
					db.list(prefixScan(["followedBy", value.author_id])).map(({ value: from }) => {
						db.set(["timeline", from, value.created_at, value.id], value.id)
					})
				}
			},
		}

		const db = new InMemoryDatabase(codec.compare)

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
			// Manually running indexes.
			userPostsIndex.update(db, [{ key: ["post", post.id], value: post }], [])
			postToTimelineIndex.update(db, [{ key: ["post", post.id], value: post }], [])
		}

		for (const { id } of users) {
			// Two posts per user.
			assert.equal(db.list(prefixScan(["userPosts", id])).length, 2)
			// No follows so empty timelines.
			assert.equal(db.list(prefixScan(["timeline", id])).length, 0)
		}

		// Create a follow should add to the timeline index.
		db.set(["follow", ["u1", "u2"]], "u1")
		followedByIndex.update(db, [{ key: ["follow", ["u1", "u2"]], value: { id: ["u1", "u2"] } }], [])
		followToTimlineIndex.update(
			db,
			[{ key: ["follow", ["u1", "u2"]], value: { id: ["u1", "u2"] } }],
			[]
		)
		assert.equal(db.list(prefixScan(["timeline", "u1"])).length, 2)

		// Create another follow
		db.set(["follow", ["u1", "u3"]], "u1")
		followedByIndex.update(db, [{ key: ["follow", ["u1", "u3"]], value: { id: ["u1", "u3"] } }], [])
		followToTimlineIndex.update(
			db,
			[{ key: ["follow", ["u1", "u3"]], value: { id: ["u1", "u3"] } }],
			[]
		)
		assert.equal(db.list(prefixScan(["timeline", "u1"])).length, 4)

		// Remove that first follow.
		db.delete(["follow", ["u1", "u2"]])
		// IMPORTANT: need to run tertiary index updates before secondary updates.
		followToTimlineIndex.update(
			db,
			[],
			[{ key: ["follow", ["u1", "u2"]], value: { id: ["u1", "u2"] } }]
		)
		followedByIndex.update(db, [], [{ key: ["follow", ["u1", "u2"]], value: { id: ["u1", "u2"] } }])
		assert.equal(db.list(prefixScan(["timeline", "u1"])).length, 2)
	})
})
