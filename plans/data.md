Lets focus specifically on the src/tupledb package.

Read the src/tupledb/README.md to get an overview of how it works currently.

I'm creating a new database abstraction with the primary goal to have a seamless platform for building web applications that synchronize database state in realtime. Its kind of like foundationdb-lite meets firebase-with-more-low-level-capabilties.

1. It’s written in typescript so that you can use it both the browser and node.js backend.
2. The OKV abstraction is generic so you can use many different backends. Note that right now, it only supports synchronous backends like SQLite and InMemory. For simplicity, we will stick with synchronous for now. Browsers needs to have a synchronous in-memory cache for rendering components and SQLite is fine for now.
3. I like the idea of keeping some abstractions more generic to work on OKV, such as the Cache which shouldn't have to make any assumptions about tuples. However, I can imagine wanting to call cache.subspace() and so we will likely need to build abstractions around the cache to support more complex things.

I’ve made some good progress so far. Here are my current abstractions.

Things build on top of each other with encoding layers similar to foundationdb: Okv -> TupleOkv -> TupleDb -> TupleTx

I use the concept of a "transaction" simply to mean a batch write. Since the database is synchronous, we don't need to worry about concurrency issues for now.

The cache works but is not complete in terms of the features we need, particularly when it comes to syncing and writing.

Given the state of tupledb, it isn't exactly usable for building realtime web applications yet. So I want to think through how to build those abstractions.

## Syncable

Lets think through the full loop.

`syncable` implies there’s a clock, history, and nested subspace for data. Something like this:

```tsx
function writeSyncable(db: TupleDb, args: WriteArgs<Tuple, JSONValue>) {
	const clock = db.get(["clock"]) ?? 0
	db.set(["history", clock], args)
	db.set(["clock"], clock + 1)
	db.subspace(["data"], args)
}
```

When it comes to interacting with this we can use a simple abstraction…

```tsx
const user = syncable(db.subspace(["user", id]))

// History api is just db.subspace(["history"]).list(args)
// The normal list api is just db.subspace(["data"]).list(args)
// And write passes through the writeSyncable function to track history.
user.clock()
user.history({limit: 10, reverse: true})
user.subspace(["inbox"]).list({limit: 10})
user.set("inbox", msg.createdAt, msg.id], value: msg)
```

The nice thing about this abstraction is that we can compose things together and transactionally write across multiple of these syncable subspaces. As an example, imagine a situation where sending a message will fan out across multiple user’s inboxes:

```tsx
function sendMessage(msg) {
	const tx = tupleTx(db)

	// Record sent message
	syncable(tx.subspace(["user", msg.from]))
		.set(["sent", msg.createdAt, msg.id], msg)

	// Fan out to recipients
	for (const to of msg.to)
		syncable(tx.subspace(["user", to]))
			.set(["inbox", msg.createdAt, msg.id], msg)
}
```

Compared to alternatives like Automerge, I like the fact that this is transactional and we will never run into a situation where a crash causes a message to only be partially written.

And now to tie things together with the frontend and the backend, there are a bunch of things on my mind that we need to think through.

1. A generic websocket-based pubsub api. Lets assume this is public and unauthenticated and the only data we’re comfortably publishing is the clocks.
2. A means of representing writes as operations so that the history is legible and logical rather than low-level representation of index writes. Send message vs Receive message. Reindexing data shouldn’t require writing all the index changes to the history log. It can just be a single operation called “re-indexing migration 12” or something.
3. We want to make sure that writes are idempotent from the client. That means writes should come with an id and the server should check if its been written or not.
4. Similarly, we should make sure that publishing clock updates is reliable and transactional with the database write. I don’t want a situation where the database can write but the publish fails forever without recovery. This should involve writing the published key-value to a queue somewhere within the database.
5. We need an in-memory cache on the client that performs a bunch of functions.
    - keep track of which syncable subspaces we have in the database and subscribed to. There should be some reference counting here so that multiple components can be subscribed to the same subspace. This subscription amounts to listening to the clock updates over pubsub.
    - keep track of which ranges are actually in the cache so that we can respond synchronously with hit or miss. We can also include “prefix” option which is just a partial hit if we have the beginning of the results. This also needs some reference counting so that we can purge ranges that are no longer being listened to.
    - handle reactivity of data updating in the database on the client. Since reads are just ranges, we can model subscriptions as ranges as well and when new data is written to the cache, we can find all subscriptions that overlap with those ranges to emit a change so they re-read and update.
    - optimistically write data in the cache locally and queue writes to the server. clients should be able to render history and updates optimistically and tolerate intermittent network connectivity. Clients should be able to render which updates in the history are optimistic and which have been authoritatively resolves with the server. This queue of writes should be persisted to localstorage just in case the browser refreshes so that we don’t lose writes.
    - Sync the database state with the server. This involves a few different things.
        - Writing to the server and rebasing as necessary to resolve changes on the client so that the optimistic state of remaining pending writes is accurate and correct.
        - Compare the clock updates from pubsub with the last sync’d clock value and read new data as necessary. There are two different ways to sync this data.
            1. The cache can simply fetch history records to catch up with the clock and apply those changes locally.
            2. The cache can simply refetch the existing ranges in the cache and replace them with up to date data.

            The decision on which approach to make should be left to the developer and we can provide some example heuristics to use as well.


    An important consideration is how history should be stored in the cache. The client should be able to query history to render it. And the client should be able to query for optimistic history too. But history from the server is immutable. For the most part, the cache doesn’t need to keep any of the server history in the cache unless the client is actually subscribed to it for the purpose of rendering.


Here’s the pubsub abstractions I’d like to use on the client.

```tsx
type Pubsub = {
	subscribe(key: Tuple): void
	unsubscribe(key: Tuple): void
	onMessage(listener: (key: Tuple, value: JSONValue) => void): () => void
}
```

As an example application, I think we can consider thinking about this messaging app concept with simple fan out to user recipients. I’d like to reuse the database write functions on both the client and the server. This means that the client may fanout writes to other users, but since that data isn’t subscribed to, it is simply garbage collected.

We don't have types yet for the schemas, but lets at least make notes in comments about what the schema structure is assumed to be. And ideally, we can simply use function composition to make it easy to maintain that structure.

