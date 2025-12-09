import { Cache } from "./Cache"
import { TupleDb, Tuple, JSONValue, WriteArgs, ListArgs } from "./types"
import { TuplePubsubClient } from "./TuplePubsub"
import { syncable, SyncableDb } from "./Syncable"

export interface SyncApiClient {
	// Fetches history from a given clock to the latest.
	fetchHistory(
		startClock: number,
		endClock?: number
	): Promise<{ clock: number; writes: WriteArgs<Tuple, JSONValue> }[]>

	// Pushes a batch of writes to the server.
	pushWrites(writes: WriteArgs<Tuple, JSONValue>[]): Promise<boolean> // Returns true on success

	// Gets the current latest clock from the server.
	getLatestClock(): Promise<number>
}

export class SyncClient {
	private cache: Cache<Tuple, JSONValue>
	private tuplePubsub: TuplePubsubClient
	private apiClient: SyncApiClient
	private lastSyncedClock: number = 0 // The clock up to which we have synced with the server.

	constructor(
		cache: Cache<Tuple, JSONValue>,
		tuplePubsub: TuplePubsubClient,
		apiClient: SyncApiClient
	) {
		this.cache = cache
		this.tuplePubsub = tuplePubsub
		this.apiClient = apiClient

		// Subscribe to clock updates from the pubsub.
		this.tuplePubsub.onMessage(this.handlePubsubMessage)
	}

	private handlePubsubMessage = async (key: Tuple, value: JSONValue) => {
		// Assuming pubsub messages are for clock updates for now.
		// The key would be ["clock", subspacePrefix]
		// The value would be the new clock value.
		// For now, let's assume a global clock update.
		if (key[0] === "clock" && typeof value === "number") {
			const serverClock = value
			// const subspacePrefix = key.slice(1) // Get the prefix if the clock is for a subspace.

			if (serverClock > this.lastSyncedClock) {
				console.log(
					`Server clock (${serverClock}) is ahead of local clock (${this.lastSyncedClock}). Fetching history...`
				)
				await this.fetchAndApplyHistory(serverClock)
			}
		}
	}

	private async fetchAndApplyHistory(serverClock: number) {
		try {
			// Fetch history from the last synced clock up to the server clock.
			// The server's fetchHistory should return records *starting from* lastSyncedClock + 1.
			const historyRecords = await this.apiClient.fetchHistory(this.lastSyncedClock + 1, serverClock)
			console.log(`Fetched ${historyRecords.length} history records. Start: ${this.lastSyncedClock + 1}, End: ${serverClock}`)

			for (const record of historyRecords) {
				// Apply each write batch from history to the cache.
				// We need to prefix the keys with ["data"] to match the local cache structure.
				const dataPrefix: Tuple = ["data"]
				const prefixedWrites: WriteArgs<Tuple, JSONValue> = {
					set: record.writes.set?.map(({ key, value }) => ({ key: [...dataPrefix, ...key], value })),
					delete: record.writes.delete?.map((key) => [...dataPrefix, ...key]),
				}
				console.log("Applying prefixed writes:", JSON.stringify(prefixedWrites, null, 2))

				this.cache.applyHistoryUpdate(prefixedWrites)
				this.lastSyncedClock = record.clock // Update local clock as we apply.
			}
			console.log(`Successfully synced to server clock: ${this.lastSyncedClock}`)
		} catch (error) {
			console.error("Error fetching and applying history:", error)
			// TODO: Implement retry logic or error handling.
		}
	}

	// Method to synchronize data with the server.
	async sync() {
		// 1. Get all pending optimistic writes from the cache.
		const pendingOptimisticWrites = this.cache.getPendingOptimisticWrites()

		if (pendingOptimisticWrites.length > 0) {
			console.log(`Pushing ${pendingOptimisticWrites.length} pending optimistic writes to server...`)
			const writesToPush = pendingOptimisticWrites.map((item) => item.writes)

			try {
				const success = await this.apiClient.pushWrites(writesToPush)
				if (success) {
					console.log("Successfully pushed optimistic writes. Resolving local optimistic writes...")
					for (const { optimisticId } of pendingOptimisticWrites) {
						this.cache.resolveOptimisticWrite(optimisticId) // Let resolveOptimisticWrite emit.
					}
					console.log("Local optimistic writes resolved.")
				} else {
					console.warn("Failed to push optimistic writes to server. Will retry later.")
					// TODO: Implement retry mechanism.
				}
			} catch (error) {
				console.error("Error pushing optimistic writes:", error)
				// TODO: Implement error handling / backoff.
			}
		} else {
			console.log("No pending optimistic writes to push.")
		}

		// Also ensure we are caught up to the latest server clock after pushing writes.
		// This handles cases where client comes online, pushes writes, and then needs to pull new server state.
		try {
			const latestServerClock = await this.apiClient.getLatestClock()
			if (latestServerClock > this.lastSyncedClock) {
				await this.fetchAndApplyHistory(latestServerClock)
			}
		} catch (error) {
			console.error("Error getting latest server clock or fetching history during sync:", error)
		}
	}

	// This method could be used by components to get a syncable view of the data.
	getSyncableDb(): SyncableDb {
		// CacheToTupleDbAdapter makes the Cache instance look like a TupleDb.
		const cacheAsTupleDb = new CacheToTupleDbAdapter(this.cache)
		// Then, we can create a syncable view on top of this adapter.
		return syncable(cacheAsTupleDb)
	}
}

// Adapter to make Cache conform to TupleDb interface
class CacheToTupleDbAdapter implements TupleDb {
	constructor(private cache: Cache<Tuple, JSONValue>) {}

	get compare(): (a: Tuple, b: Tuple) => number {
		return this.cache.compare
	}

	list(args?: ListArgs<Tuple>): { key: Tuple; value: JSONValue }[] {
		const result = this.cache.list(args)
		if (result.hit) return result.hit
		if (result.prefix) return result.prefix
		// For a full TupleDb, we assume we always return something if it's there.
		// If it's a miss, it means the key is not in cache, so return empty.
		return []
	}

	get(key: Tuple): JSONValue | undefined {
		const result = this.cache.list({ gte: key, lte: key })
		if (result.hit && result.hit.length > 0) {
			return result.hit[0].value
		}
		return undefined
	}

	has(key: Tuple): boolean {
		return this.get(key) !== undefined
	}

	set(key: Tuple, value: JSONValue): void {
		this.cache.write({ set: [{ key, value }] })
	}

	delete(key: Tuple): void {
		this.cache.write({ delete: [key] })
	}

	write(tx: WriteArgs<Tuple, JSONValue>): void {
		this.cache.write(tx)
	}

	subspace(prefix: Tuple): TupleDb {
		// This needs to return a new CacheToTupleDbAdapter that operates on a prefixed view of the cache.
		// However, Cache itself doesn't have a subspace method.
		// This implies the adapter needs to manage prefixing keys for all operations.

		// A simpler approach for now is to return a new adapter that prepends the prefix to all keys.
		// This essentially creates a "view" of the cache restricted to that subspace.
		return new PrefixedCacheToTupleDbAdapter(this.cache, prefix)
	}
}

// Helper adapter for subspaces
class PrefixedCacheToTupleDbAdapter implements TupleDb {
	constructor(private cache: Cache<Tuple, JSONValue>, private prefix: Tuple) {}

	private prependKey(key: Tuple): Tuple {
		return [...this.prefix, ...key]
	}

	private unprependKey(key: Tuple): Tuple {
		return key.slice(this.prefix.length)
	}

	private prependListArgs(args?: ListArgs<Tuple>): ListArgs<Tuple> | undefined {
		if (!args) return undefined
		return {
			...args,
			gt: args.gt ? this.prependKey(args.gt) : undefined,
			gte: args.gte ? this.prependKey(args.gte) : undefined,
			lt: args.lt ? this.prependKey(args.lt) : undefined,
			lte: args.lte ? this.prependKey(args.lte) : undefined,
		}
	}

	private unprependListResult(
		result: { key: Tuple; value: JSONValue }[]
	): { key: Tuple; value: JSONValue }[] {
		return result.map((item) => ({ key: this.unprependKey(item.key), value: item.value }))
	}

	get compare(): (a: Tuple, b: Tuple) => number {
		return this.cache.compare
	}

	list(args?: ListArgs<Tuple>): { key: Tuple; value: JSONValue }[] {
		const prefixedArgs = this.prependListArgs(args) || { gte: this.prefix, lte: [...this.prefix, "\xff"] }
		const result = this.cache.list(prefixedArgs)

		let hitOrPrefix: { key: Tuple; value: JSONValue }[] = []
		if (result.hit) hitOrPrefix = result.hit
		else if (result.prefix) hitOrPrefix = result.prefix

		return this.unprependListResult(hitOrPrefix)
	}

	get(key: Tuple): JSONValue | undefined {
		const prefixedKey = this.prependKey(key)
		const result = this.cache.list({ gte: prefixedKey, lte: prefixedKey })
		return result.hit?.[0]?.value
	}

	has(key: Tuple): boolean {
		return this.get(key) !== undefined
	}

	set(key: Tuple, value: JSONValue): void {
		this.cache.write({ set: [{ key: this.prependKey(key), value }] })
	}

	delete(key: Tuple): void {
		this.cache.write({ delete: [this.prependKey(key)] })
	}

	write(tx: WriteArgs<Tuple, JSONValue>): void {
		const prefixedTx: WriteArgs<Tuple, JSONValue> = {
			set: tx.set?.map((item) => ({ key: this.prependKey(item.key), value: item.value })),
			delete: tx.delete?.map((key) => this.prependKey(key)),
		}
		this.cache.write(prefixedTx)
	}

	subspace(nestedPrefix: Tuple): TupleDb {
		return new PrefixedCacheToTupleDbAdapter(this.cache, [...this.prefix, ...nestedPrefix])
	}
}
