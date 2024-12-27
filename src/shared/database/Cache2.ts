/*

Back to first principles.
We're going to start with just solving the problem, and then worry about performance later.

*/

import { randomId } from "../randomId"
import { InMemoryDatabase } from "./InMemoryDatabase"
import { InMemoryIntervalTree } from "./InMemoryIntervalTree"

// This is where we store the data for the cache.
const data = new InMemoryDatabase<string, string>()

// This is where we store the listeners for data changes in the cache.
const listeners = new InMemoryIntervalTree<[string, string, string], () => void>()

function subscribe(key: [string, string], listener: () => void) {
	const [start, end] = key
	const id = randomId()
	listeners.set([start, end, id], listener)
	return () => listeners.delete([start, end, id])
}

function emitters(keys: string[]) {
	const fns = new Set<() => void>()
	for (const key of keys) {
		for (const { value: listener } of listeners.intersects(key)) {
			fns.add(listener)
		}
	}
	return fns
}

function emit(keys: string[]) {
	for (const fn of emitters(keys)) fn()
}
