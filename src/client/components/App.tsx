import React, { useState } from "react"
import { codec } from "tupledb/Codec"
import { ListArgs, Tuple, WriteArgs } from "tupledb/types"
import { useRouterState } from "ui/services/Router"
import { ClientEnvironment, useClientEnvironment } from "../services/ClientEnvironment"

const cache: any = {}

// Cache needs a way to finding all the ranges in some overlap.
// Needs some way of

function atom(environment: ClientEnvironment, path: Tuple) {
	const { api, pubsub } = environment

	async function fetch(args: ListArgs<any[]>) {
		const response = await api.listAtom({ atomPath: path, listArgs: args })

		// TODO: queue of things to sync.
		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		const { data, reads } = response.body

		cache.insert(reads, data)
	}

	pubsub.subscribe(codec.encode([...path, "clock"]))

	// TODO: perhaps the wrong place for this stateful thing.
	const unsubscribe = pubsub.onMessage(async (key, value) => {
		if (key === codec.encode([...path, "clock"])) {
			const reads = cache.reads.overlaps(path)
			// Refetch the reads...
			// TODO: alternatively, we should compare local and remote versions, etc.
			await Promise.all(reads.map(fetch))
		}
	})

	return {
		list(args: ListArgs<any[]>) {
			const result = cache.subspace(path).list(args)
			if (!result.hit) fetch(args)
			return result
		},
		write(args: WriteArgs<Tuple, any[]>) {
			// opt 1. write to the cache, have a separate process that reads the cache and flushes to the server
			//        then what about updates?
			// opt 2.
		},
		destroy() {
			unsubscribe()
		},
	}

	const result = cache.list({ gte: [...path, "clock"], lte: [...path, "clock"], limit: 1 })
	if (result.hit) {
		const clock = result.hit.at(0)?.value ?? 0
	}

	return {
		load() {},
	}
}

// Data Model
// [list]: string[]
// [todo, id]: {id, text, done}

// The waterfall can be mitigated by calling a custom API that returns all the ranges, the query abstraciton.

export function App() {
	const environment = useClientEnvironment()
	const route = useRouterState(environment.router)

	const [filter, setFilter] = useState<"all" | "active" | "done">("all")

	return (
		<div>
			<h3>TodoMVC</h3>

			<fieldset>
				<label>
					<input
						type="radio"
						name="filter"
						value="all"
						checked={filter === "all"}
						onChange={(e) => setFilter(e.target.value as "all")}
					/>
					All
				</label>
				<label>
					<input
						type="radio"
						name="filter"
						value="active"
						checked={filter === "active"}
						onChange={(e) => setFilter(e.target.value as "active")}
					/>
					Active
				</label>
				<label>
					<input
						type="radio"
						name="filter"
						value="completed"
						checked={filter === "done"}
						onChange={(e) => setFilter(e.target.value as "done")}
					/>
					Completed
				</label>
			</fieldset>
		</div>
	)
}
