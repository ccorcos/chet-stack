# Sync Architecture Plan

## Overview

The synchronization stack is designed to provide a robust, offline-first, realtime data layer for web applications. It consists of three distinct layers:

1.  **Generic Cache (`Cache<K, V>`):** A purely local, in-memory Ordered Key-Value (OKV) store. It is unaware of the network or synchronization protocols.
2.  **Sync Client (`SyncClient`):** The orchestrator. It manages the connection to the server, implements the `Syncable` protocol (history, clock, data prefixes), and coordinates data fetching and updates.
3.  **React Hooks:** The public API for the UI. They handle component lifecycle integration, subscription management, and exposing data states (`hit`, `miss`, `prefix`) to the application.

## Component Responsibilities

### 1. Generic Cache (`Cache<K, V>`)
**Role:** A generic, in-memory storage engine.
**Genericity:** Fully generic. `K` and `V` can be any types, provided a comparator is available.
**Responsibilities:**
*   **Storage:** Stores data (`this.data`) and tracks valid/authoritative ranges (`this.ranges`).
*   **Optimistic Writes:** Manages pending local writes (`this.optimisticWrites`) that haven't been confirmed by the server.
*   **Querying:** `list(args)` returns `{ hit: ..., miss: ..., prefix: ... }` explicitly, allowing the consumer to detect missing data.
*   **Change Notification:** Emits events when data changes, allowing the `SyncClient` (and effectively the UI) to re-render.

### 2. Sync Client (`SyncClient`)
**Role:** The bridge between the local `Cache` and the remote `Syncable` server.
**Genericity:** Coupled to the `Syncable` protocol (which uses `Tuple` keys), but treats the `Cache` as a generic dependency.
**Responsibilities:**
*   **Protocol Management:** Knows that server data lives under `["data"]`, history under `["history"]`, etc. Handles key prefixing/unprefixing when moving data between Server and Cache.
*   **Reference Counting:** Tracks active subscriptions from the UI.
    *   `subscribe(range)`: Increments ref count. If new, triggers fetch.
    *   `unsubscribe(range)`: Decrements ref count.
*   **Data Fetching:**
    *   **Initial Fetch:** When a subscription is added and `Cache` reports a miss, `SyncClient` queues a fetch from the API.
    *   **Updates:** Listens to PubSub. When a notification arrives, it fetches the history log (or specific keys) and applies them to the `Cache`.
*   **Network Tolerance:**
    *   **Request Management:** Uses a `RequestManager` (or similar) to dedup in-flight requests for the same range/keys.
    *   **Retries:** Automatically retries failed requests with exponential backoff.
*   **Synchronization:**
    *   **Pull:** Fetches history from `lastSyncedClock`.
    *   **Push:** Sends optimistic writes to the server.

### 3. React Hooks (`useQuery`, `useMutation`)
**Role:** The application interface.
**Responsibilities:**
*   **Lifecycle:** Calls `client.subscribe(range)` on mount and `client.unsubscribe(range)` on unmount.
*   **State Exposure:** Returns `{ data, loading, error, status }`. `status` can be `hit`, `miss`, or `partial`.
*   **Reactivity:** Subscribes to `Cache` (via `SyncClient`) to trigger re-renders on data changes.

## Data Flow

### 1. Reading Data (The `useQuery` Hook)
1.  **Component Mount:** `useQuery(range)` is called.
2.  **Subscription:** Hook calls `syncClient.subscribe(range)`.
3.  **Ref Counting:** `SyncClient` increments active count for `range`.
4.  **Cache Check:** `SyncClient` queries `Cache.list(range)`.
5.  **Hit:** Returns data immediately.
6.  **Miss:**
    *   `SyncClient` returns `miss` status.
    *   `SyncClient` triggers `fetch(range)` (deduped).
    *   `fetch` calls API -> gets data -> calls `cache.write()` + `cache.ranges.insert()`.
    *   `Cache` emits update -> `SyncClient` notifies Hook -> Component re-renders with data.

### 2. Writing Data (The `useMutation` Hook)
1.  **Mutation:** `useMutation` calls `syncClient.write(args)`.
2.  **Optimistic Update:** `SyncClient` calls `cache.write(args)` (generating an optimistic ID).
3.  **UI Update:** Cache emits change -> UI shows new data immediately.
4.  **Network Request:** `SyncClient` pushes write to Server API.
5.  **Success:**
    *   Server confirms write (returns new clock/history).
    *   `SyncClient` fetches/receives history update.
    *   `SyncClient` calls `cache.applyHistoryUpdate()`.
    *   `Cache` resolves optimistic write (replaces it with confirmed data).
6.  **Failure:**
    *   `SyncClient` retries.
    *   If terminal failure, `SyncClient` reverts optimistic write in `Cache` and notifies UI.

## Detailed Design Specs

### Reference Counting & Subscriptions
```typescript
class SyncClient {
    private subscriptions = new Map<string, number>() // Range key -> count

    subscribe(range: Range) {
        const key = JSON.stringify(range)
        const count = this.subscriptions.get(key) || 0
        this.subscriptions.set(key, count + 1)

        if (count === 0) {
            this.ensureData(range)
            this.pubsub.subscribe(rangeToTopic(range))
        }
    }

    unsubscribe(range: Range) {
        // ... decrement ...
        if (newCount === 0) {
            // Optional: Debounce cleanup or remove immediately
            this.pubsub.unsubscribe(rangeToTopic(range))
        }
    }
}
```

### Network Tolerance (RequestManager)
A `RequestManager` class will handle:
*   **Deduping:** usage of `Map<string, Promise<any>>`. If a request for Key X is in flight, return existing promise.
*   **Retries:** Wrapper around `fetch` that catches errors, waits (backoff), and retries N times.

### Generic Cache Refactoring
Ensure `Cache.ts` definition looks like:
```typescript
export class Cache<K, V> {
    constructor(private comparator: (a: K, b: K) => number) {}
    // ...
}
```
It should not import `Tuple`.

## Implementation Roadmap

1.  **Refactor Cache:** Make `Cache` fully generic (remove `Tuple` dependency).
2.  **Enhance SyncClient:**
    *   Implement `RequestManager` with retry/dedupe.
    *   Implement Reference Counting for subscriptions.
    *   Ensure proper coordination with `Syncable` protocol (prefixing).
3.  **Build React Hooks:** Implement `useSyncableQuery` and `useSyncableWrite` in `src/client/hooks`.
4.  **Verify:** Update tests and build a robust demo.
