import { KeyEncodeWrite, TupleSubspaceEncoder } from "./Encoder"
import { JSONValue, ListArgs, Tuple, TupleDb, WriteArgs } from "./types"

export type SyncableDb = {
	clock: () => number
	history: (args?: ListArgs<Tuple>) => { key: Tuple; value: WriteArgs<Tuple, JSONValue> }[]

	list: (args?: ListArgs<Tuple>) => { key: Tuple; value: JSONValue }[]
	write: (args: WriteArgs<Tuple, JSONValue>) => void

	get: (key: Tuple) => JSONValue | undefined
	set: (key: Tuple, value: JSONValue) => void
	delete: (key: Tuple) => void
	subspace: (prefix: Tuple) => SyncableDb
}

export function writeSyncable(db: TupleDb, args: WriteArgs<Tuple, JSONValue>) {
	// 1. Get the current clock
	const clock = (db.get(["clock"]) as number) ?? 0

	// 2. Write the operation to the history log
	// We store the whole batch as the value.
	db.set(["history", clock], args)

	// 3. Increment the clock
	db.set(["clock"], clock + 1)

	// 4. Apply writes to the "data" subspace
	const dataSpace = db.subspace(["data"])
	dataSpace.write(args)
}

export function syncable(db: TupleDb): SyncableDb {
	const dataSpace = db.subspace(["data"])
	const historySpace = db.subspace(["history"])

	return {
		clock: () => (db.get(["clock"]) as number) ?? 0,
		history: (args) => {
			// Start query from the history subspace
			return historySpace.list(args) as { key: Tuple; value: WriteArgs<Tuple, JSONValue> }[]
		},
		write: (args) => {
			writeSyncable(db, args)
		},
		set: (key, value) => {
			writeSyncable(db, { set: [{ key, value }] })
		},
		delete: (key) => {
			writeSyncable(db, { delete: [key] })
		},
		get: (key) => dataSpace.get(key),
		list: (args) => dataSpace.list(args),
		subspace: (prefix) => {
			// When creating a subspace of a syncable, we are essentially
			// creating a syncable view of a subset of the data.
			// However, 'syncable' expects a DB that has [clock, history, data].
			// If we subspace 'data', we lose the clock and history context.

			// If the user wants a nested syncable object (e.g. distinct history),
			// they should pass a db subspace to `syncable()`.

			// If they want a convenience wrapper for reading/writing deep keys
			// BUT sharing the same history/clock as the parent, we need to handle that.

			// For now, let's assume 'subspace' returns a wrapper that forwards
			// writes to the parent 'writeSyncable' but with prefixed keys.

			// Actually, to keep it simple and avoid complexity:
			// Let's defer recursive subspacing unless strict requirements arise.
			// But 'TupleDb' requires 'subspace' to return a 'TupleDb'.
			// 'SyncableDb' is not exactly 'TupleDb'.

			// Let's implement a proxy that prefixes keys for the 'data' reads
			// and prefixes keys for the 'write' calls.
			return syncableSubspace(db, prefix)
		},
	}
}

function syncableSubspace(rootDb: TupleDb, prefix: Tuple): SyncableDb {
	const rootData = rootDb.subspace(["data"])
	const subspaceData = rootData.subspace(prefix)
	const encoder = TupleSubspaceEncoder(prefix)

	// Helper to prefix keys
	const prepend = (k: Tuple) => [...prefix, ...k]

	return {
		clock: () => (rootDb.get(["clock"]) as number) ?? 0,
		history: (args) => {
			// This is tricky. Do we filter history for just this subspace?
			// The current simple implementation logs all writes to the root history.
			// Filtering would require inspecting the values in history.
			// For now, return global history (maybe not ideal but simpler).
			return rootDb.subspace(["history"]).list(args) as any
		},
		write: (args) => {
			// We need to prefix the keys in args before sending to root writeSyncable
			const prefixedArgs = KeyEncodeWrite(args, encoder)
			writeSyncable(rootDb, prefixedArgs)
		},
		set: (key, value) => {
			writeSyncable(rootDb, { set: [{ key: prepend(key), value }] })
		},
		delete: (key) => {
			writeSyncable(rootDb, { delete: [prepend(key)] })
		},
		get: (key) => subspaceData.get(key),
		list: (args) => subspaceData.list(args),
		subspace: (nestedPrefix) => syncableSubspace(rootDb, [...prefix, ...nestedPrefix]),
	}
}
