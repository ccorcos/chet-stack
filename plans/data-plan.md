# Data Synchronization Implementation Plan

This plan implements the "Syncable" database abstraction for realtime web apps, building on `src/tupledb`.

## Phase 1: Syncable Primitives (Backend/Shared)

Implement the core logic for versioned writes and history tracking within `tupledb`.

- [ ] **Create `src/tupledb/Syncable.ts`**
    - Define `Syncable` interface/wrapper.
    - Implement `writeSyncable(db: TupleDb | TupleTx, updates: { key: Tuple, value: any }[])`.
        - Logic:
            1. Read `["clock"]`.
            2. For each update, write to `["history", clock, ...key]`.
            3. Apply updates to `["data"]` subspace.
            4. Increment and write `["clock"]`.
    - Implement `syncable(db: TupleDb)` factory/helper.
        - Returns an object with:
            - `subspace(prefix)`: Returns a generic `TupleDb` view of `["data", ...prefix]`.
            - `history(args)`: Queries `["history"]`.
            - `clock()`: Gets current clock.
            - `write(updates)`: Calls `writeSyncable`.
- [ ] **Tests (`src/tupledb/Syncable.test.ts`)**
    - Verify writing increments clock.
    - Verify history is stored correctly.
    - Verify data is accessible via standard `get`/`list` in the data subspace.

## Phase 2: Tuple PubSub Integration

Adapt `src/pubsub` to work with `Tuple` keys for notifying clients of changes.

- [ ] **Create `src/tupledb/TuplePubSub.ts`**
    - Class `TuplePubSubClient` wrapping `WebsocketPubsubClient`.
    - `subscribe(key: Tuple)`: Canonicalizes tuple to string -> `client.subscribe`.
    - `publish(key: Tuple, payload: any)`: Canonicalizes -> `client.publish`.
    - `onMessage(callback)`: Decodes key -> `callback(key, value)`.
- [ ] **Server Integration**
    - Ensure `WebsocketPubsubServer` is accessible to the `TupleDb` write logic (or handled in the API layer).

## Phase 3: Client-Side Sync Manager

Enhance `Cache` to handle replication and optimistic updates.

- [ ] **Enhance `src/tupledb/Cache.ts`**
    - Ensure `write` (optimistic) persists pending writes until confirmed.
    - Add methods to `applyUpdates(updates)` (from server history).
- [ ] **Create `src/tupledb/SyncClient.ts`**
    - Purpose: Coordinate `Cache`, `TupleDb` (API), and `TuplePubSub`.
    - State: `lastSyncedClock`.
    - `sync()` method:
        - Send pending optimistic writes to server.
        - Rebase local changes if conflict (LWW or append-only assumption for now).
    - `onClockUpdate` handler:
        - If `serverClock > lastSyncedClock`:
            - Fetch history from `lastSyncedClock` to `serverClock`.
            - Apply updates to `Cache`.
            - Update `lastSyncedClock`.
- [ ] **Tests (`src/tupledb/SyncClient.test.ts`)**
    - Mock network/server.
    - Verify optimistic writes are queued.
    - Verify incoming history updates cache.

## Phase 4: API & E2E Demo

- [ ] **API Layer**
    - Expose `syncable` operations via a `client.ts` / `server.ts` pair in `src/tupledb` or `src/api`.
- [ ] **Chat Demo**
    - Update `src/client/demos` to include a simple Chat using `SyncClient`.
    - Verify realtime updates across two browser windows (or simulated clients).
