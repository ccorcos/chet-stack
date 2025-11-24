# TupleDb

This is a simple implemention of a tuple database. It's synchonous only which has its limitations, but computers are fast these days and I don't expect I will need an async version of this for some time.

## Okv

The lowest level is an ordered-key-value store. `list` to read ranges, `write` to write data, and `compare` so that we can build intermediate caching mechanisms.

```ts
export type Okv<K, V> = {
	compare: (a: K, b: K) => number
	list(args?: ListArgs<K>): { key: K; value: V }[]
	write: (tx: WriteArgs<K, V>) => void
}
```

Most persisted okv's will store string keys and string values such as Sqlite: `class SQLiteOkv implements Okv<string, string>`.

When building an in-memory okv however, we don't need to serialize values so we get `Okv<string, any>` for free.

## TupleOkv

To get a tuple database, we need to do some encoding of tuples into lexicographically ordered strings and wrap the Okv api. That's exactly what the functions in `Encodings.ts` help with. In practice, you can just do this:

```ts
// For a persisted database
const base = tupleOkv(new SqliteOkv("app.db"))
// For an in-memory database
const base = new InMemoryOkv(codec.compare)
```

While we can do `tupleOkv(new InMemoryDatabase())`, we'd be serializing keys when we don't have to so its much more performant just to pass a custom compare function.

## TupleDb

The base tupleDb is great for building abstractions on top of, but it's a bit cumbersome to use and thats what `tupleDb` is for.

```ts
const db = tupleDb(base)

db.set(["users", 1], { id: 1, name: "Chet" })
db.has(["users", 1])
db.get(["users", 1])
db.delete(["users", 1])

const users = db.subspace(["users"])
users.set(2, { id: 2, name: "Simon" })
```

## Cache

The `Cache` is the workhorse of the client-side database.

```ts
const cache = new Cache<Tuple, JSONValue>(codec.compare)

const listUsersArg = { gt: ["users"], lt: ["users", "\xff"], limit: 100 }
const data = db.list(listUsersArg)

// Insert data into the cache overwriting any previous data in that range.
cache.insert(listUsersArg, data)

// Optimistically write data into the cache.
const finalize = cache.write({ key, value })

// Write to the database
db.write({ key, value })
// Once the write succeeds, we can insert it into the cache and finalize the optimistic write
cache.insert({ gte: key, lte: key }, [{ key, value }])
finalize()

// Subscribe to a query.
cache.subscribe(listUsersArg, () => {
	// Users updated!
	const result = cache.list(listUsersArg)
	if (cache.miss) {
		// Not in the cache
	} else if (cache.prefix) {
		// We currently have a prefix subset of the results.
	} else if (cache.hit) {
		// We have all the results of the query.
	}
})
```

## Transaction

Transactions essentially use a cache in between the database to aggregate writes before sending committing. There is no concurency control and these transactions are not ACID. They're merely a useful way of writing to the database.

```ts
const tx = tupleTx(db)
tx.set(...)
tx.commit()
```
