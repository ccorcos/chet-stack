import { codec } from "./Codec"
import { describe, it, before, afterEach } from "mocha"
import { strict as assert } from "node:assert"
import { SyncClient, SyncApiClient } from "./SyncClient"
import { Cache } from "./Cache"
import { TupleDb, Tuple, JSONValue, WriteArgs } from "./types"
import { TuplePubsubClient } from "./TuplePubsub"
import { tupleDb } from "./TupleDb"
import { syncable, writeSyncable } from "./Syncable"

// Mock WebsocketPubsubClient (reusing the one from TuplePubsub.test.ts)
class MockWebsocketPubsubClient {
	private messageCallback: Function | null = null
	public subscribedKeys: string[] = []
	public publishedMessages: { key: string; value: any }[] = []

	onMessage(cb: Function) {
		this.messageCallback = cb
	}

	subscribe(key: string) {
		this.subscribedKeys.push(key)
	}

	unsubscribe(key: string) {
		this.subscribedKeys = this.subscribedKeys.filter((k) => k !== key)
	}

	publish(message: { key: string; value: any }) {
		this.publishedMessages.push(message)
	}

	_simulateIncomingMessage(key: string, value: any) {
		if (this.messageCallback) {
			this.messageCallback({ key, value })
		}
	}
}

// Mock SyncApiClient implementation for testing SyncClient in isolation
class MockSyncApiClient implements SyncApiClient {
	private serverDb: TupleDb // Simulate server's database
	public networkDelayMs: number = 0 // Simulate network delay

	constructor() {
		this.serverDb = tupleDb() // Use in-memory TupleDb for server
	}

	async fetchHistory(
		startClock: number,
		endClock?: number
	): Promise<{ clock: number; writes: WriteArgs<Tuple, JSONValue> }[]> {
		if (this.networkDelayMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, this.networkDelayMs))
		}
		const sdb = syncable(this.serverDb)
		const allHistory = sdb.history() // Get all history
		const filteredHistory = allHistory.filter((record) => {
			// Assuming history records store the clock as the first element of their key
			// and the value is { writes: WriteArgs, clock: number } (from Syncable.ts)
			// No, the value is just WriteArgs. The clock is part of the key.
			// Let's recheck Syncable.ts
			// db.set(["history", clock], args)
			// So history.key[0] is 'history', history.key[1] is 'clock'.

			const recordClock = record.key[1] as number
			return recordClock >= startClock && (endClock === undefined || recordClock <= endClock)
		}).map(record => ({ clock: record.key[1] as number, writes: record.value })); // Map to desired format

		return filteredHistory
	}

	async pushWrites(writes: WriteArgs<Tuple, JSONValue>[]): Promise<boolean> {
		if (this.networkDelayMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, this.networkDelayMs))
		}
		const sdb = syncable(this.serverDb)
		for (const writeArgs of writes) {
			writeSyncable(this.serverDb, writeArgs) // Apply to serverDb, creating history/clock
		}
		return true // Simulate success
	}

	async getLatestClock(): Promise<number> {
		if (this.networkDelayMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, this.networkDelayMs))
		}
		const sdb = syncable(this.serverDb)
		return sdb.clock()
	}

	// Helper for tests to directly manipulate serverDb or clear it
	clearServerDb() {
		this.serverDb = tupleDb()
	}

	getServerData() {
		return syncable(this.serverDb).list()
	}
	getServerHistory() {
		return syncable(this.serverDb).history()
	}
}

describe("SyncClient", () => {
	let clientCache: Cache<Tuple, JSONValue>
	let mockPubsubClient: MockWebsocketPubsubClient
	let mockApiClient: MockSyncApiClient
	let syncClient: SyncClient

	beforeEach(() => {
		clientCache = new Cache()
		mockPubsubClient = new MockWebsocketPubsubClient()
		mockApiClient = new MockSyncApiClient()
		syncClient = new SyncClient(clientCache, mockPubsubClient as any, mockApiClient)

		// Clear server DB before each test
		mockApiClient.clearServerDb()
	})

	it("initializes and fetches history if server is ahead", async () => {
		// Simulate initial server state
		const sdb = syncable(mockApiClient.serverDb)
		sdb.set(["test", 1], "value1")
		sdb.set(["test", 2], "value2")

		const serverClock = await mockApiClient.getLatestClock()
		assert.equal(serverClock, 2, "Server clock should be 2")

		// Manually set client's lastSyncedClock to 0 for this test
		;(syncClient as any).lastSyncedClock = 0

		// Simulate pubsub message indicating new server clock
		mockPubsubClient._simulateIncomingMessage(codec.encode(["clock"]), serverClock)

		await new Promise((resolve) => setTimeout(resolve, 50))

		// Client cache should now have the data
		assert.equal(syncClient.getSyncableDb().get(["test", 1]), "value1")
		assert.equal(syncClient.getSyncableDb().get(["test", 2]), "value2")
		assert.equal((syncClient as any).lastSyncedClock, serverClock, "Client lastSyncedClock should match serverClock")
	})

	it("pushes optimistic writes to server and resolves them locally", async () => {
		const sdb = syncable(mockApiClient.serverDb)

		// Client makes an optimistic write
		const clientSdb = syncClient.getSyncableDb()
		clientSdb.set(["client", "data"], "optimistic_value")

		// Verify it's in client's local cache
		assert.equal(clientSdb.get(["client", "data"]), "optimistic_value")
		assert.ok(clientCache.optimisticWrites.size > 0, "Should have pending optimistic writes")

		// Sync with server
		await syncClient.sync()

		// Verify client's optimistic write is resolved
		assert.equal(clientCache.optimisticWrites.size, 0, "Optimistic writes should be resolved")
		assert.equal(clientSdb.get(["client", "data"]), "optimistic_value", "Value should still be in client cache")

		// Verify server received the write
		assert.equal(mockApiClient.getServerData()[0].value, "optimistic_value", "Server should have client's data")
		assert.equal(mockApiClient.getServerHistory().length, 1, "Server should have recorded history")
	})

	it("handles server updates while client has optimistic writes", async () => {
		const sdb = syncable(mockApiClient.serverDb)

		// Server has some initial data
		sdb.set(["shared", "key"], "server_initial")
		const initialServerClock = await mockApiClient.getLatestClock()

		// Client starts with that data
		;(syncClient as any).lastSyncedClock = initialServerClock
		mockPubsubClient._simulateIncomingMessage(codec.encode(["clock"]), initialServerClock)
		await new Promise((resolve) => setTimeout(resolve, 10))
		assert.equal(syncClient.getSyncableDb().get(["shared", "key"]), "server_initial")

		// Client makes an optimistic write
		const clientSdb = syncClient.getSyncableDb()
		clientSdb.set(["client", "key"], "optimistic_client_value")
		assert.ok(clientCache.optimisticWrites.size > 0)

		// Server updates some other data
		sdb.set(["server", "only"], "new_server_data")
		const newServerClock = await mockApiClient.getLatestClock()

		// Simulate server pubsub sending new clock
		mockPubsubClient._simulateIncomingMessage(codec.encode(["clock"]), newServerClock)
		await new Promise((resolve) => setTimeout(resolve, 10))

		// Client should have pulled server's new data
		assert.equal(clientSdb.get(["server", "only"]), "new_server_data", "Client should have new server data")
		assert.ok(clientCache.optimisticWrites.size > 0, "Client's optimistic write should still be pending")

		// Now client pushes its own changes
		await syncClient.sync()

		// Client's optimistic write should be resolved
		assert.equal(clientCache.optimisticWrites.size, 0)
		assert.equal(mockApiClient.getServerData().find(i => i.key[0] === "client")?.value, "optimistic_client_value", "Server should have client's data")
	})

	it("applies history starting from lastSyncedClock + 1", async () => {
		const sdb = syncable(mockApiClient.serverDb)
		sdb.set(["item", 1], "A") // Clock 1
		sdb.set(["item", 2], "B") // Clock 2
		sdb.set(["item", 3], "C") // Clock 3

		// Client is synced up to clock 1
		;(syncClient as any).lastSyncedClock = 1

		// Simulate pubsub message for latest clock 3
		mockPubsubClient._simulateIncomingMessage(codec.encode(["clock"]), 3)
		await new Promise((resolve) => setTimeout(resolve, 10))

		// Client should have fetched and applied history for clocks 2 and 3
		assert.equal(syncClient.getSyncableDb().get(["item", 1]), "A")
		assert.equal(syncClient.getSyncableDb().get(["item", 2]), "B")
		assert.equal(syncClient.getSyncableDb().get(["item", 3]), "C")
		assert.equal((syncClient as any).lastSyncedClock, 3)
	})
})
