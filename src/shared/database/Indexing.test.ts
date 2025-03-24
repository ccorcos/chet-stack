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

import { query } from "./Query"

import { strict as assert } from "assert"
import { describe, it } from "mocha"
import { InMemoryDatabase } from "./InMemoryDatabase"
import { ListArgs, OrderedKeyValueApi } from "./types"

type Index<K, V> = {
	range: ListArgs<K>
	action: (
		db: OrderedKeyValueApi<K, V>,
		inserted: { key: K; value: V }[],
		removed: { key: K; value: V }[]
	) => void
}

describe("Indexing", () => {
	it("works", () => {
		const db = new InMemoryDatabase()

		type Person = {
			id: string
			first: string
			last: string
			birthday: string
			phone: { number: string; label: string }[]
			email: { address: string; label: string }[]
		}

		// Index by (last, first, id)

		const listenRange: ListArgs<string> = {
			gt: "person:\x00",
			lt: "person:\xff",
		}

		const update = (person: Person) => {
			return [person.last, person.first, person.id]
		}
		// Insert and remove from range.

		query(
			{ db },
			`
			const result = db.list({

			})
			`
		)

		assert.ok(true)
		assert.equal(1 + 1, 2)
		assert.deepEqual({}, {})
	})

	it("tertiary index", () => {
		const db = new InMemoryDatabase()

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

		// create/delete follow
		// create/delete post.
	})
})
