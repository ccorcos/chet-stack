# Database Usage

## TupleDB Overview

TupleDB is a custom ordered key-value store where keys are tuples (arrays) and values are JSON. Keys are stored in lexicographic order, enabling efficient range queries.

See `/src/tupledb/README.md` for comprehensive documentation.

## Basic Operations

### Set, Get, Delete
```typescript
// Set a value
db.set(["users", userId], userData)

// Get a value
const user = db.get(["users", userId])

// Delete a value
db.delete(["users", userId])
```

### Range Queries
```typescript
// List all users
const users = db.list({
  gte: ["users"],
  lte: ["users", "\xff"]
})

// List with limit
const recentUsers = db.list({
  gte: ["users"],
  lte: ["users", "\xff"],
  limit: 10,
  reverse: true
})
```

### Subspaces
Subspaces provide namespacing without repeating key prefixes:
```typescript
const userDb = db.subspace(["users"])

// These are equivalent:
userDb.set(userId, userData)
db.set(["users", userId], userData)
```

### Batch Writes
Atomic updates to multiple keys:
```typescript
db.write({
  set: [
    [["users", 1], {name: "Alice"}],
    [["users", 2], {name: "Bob"}]
  ],
  delete: [
    ["users", 3]
  ]
})
```

## Schema Conventions

Define schemas in `/src/database/schema.ts`:
```typescript
export const USER_KEY = ["users", t.number] as const
export const USER_VALUE = t.object({
  id: t.number,
  username: t.string,
  email: t.string,
  createdAt: t.number
})
```

Helper functions go in domain-specific files like `/src/database/user.ts`.

## Key Design

Design keys for efficient queries:
```typescript
// Good: Can list all posts by user
["posts", userId, postId]

// Bad: Can't efficiently query by user
["posts", postId, userId]

// Good: Can query by status and time
["tasks", status, runAt, taskId]
```

Keys are sorted lexicographically. Use this for range queries.

## Accessing the Database

### Server Side
Database is available in `ServerEnvironment`:
```typescript
export async function handler(env: ServerEnvironment, args) {
  const user = env.db.get(["users", args.userId])
  return user
}
```

### Client Side
Use React hooks:
```typescript
// Query data
const { localResult, remoteResult } = useList({
  gte: ["users"],
  lte: ["users", "\xff"]
})

// Write data
const write = useWrite()
await write({
  set: [[[key], value]],
  delete: [[key2]]
})
```

Hooks automatically handle caching, subscriptions, and optimistic updates.

## Migrations

Migration files live in `/src/server/migrations/`:
```typescript
export async function migrate(db: TupleDb) {
  // Transform data
  const users = db.list({gte: ["users"], lte: ["users", "\xff"]})
  for (const {key, value} of users) {
    // Update schema
    value.newField = "default"
    db.set(key, value)
  }
}
```

Run with `npm run migrate`.

## Indexing

TupleDB supports secondary indexes via multiple key patterns:
```typescript
// Primary key
db.set(["users", userId], userData)

// Index by email
db.set(["users-by-email", email], userId)

// Query by email
const userId = db.get(["users-by-email", email])
const user = db.get(["users", userId])
```

Keep indexes consistent using batch writes.

## Performance

- **Cache layer**: TupleDB includes an in-memory cache
- **Batch operations**: Use `write()` for multiple operations
- **Key design**: Structure keys for your query patterns
- **Subspaces**: Use for cleaner code, no performance cost

## Testing

For tests, create an in-memory database:
```typescript
import { sqlite } from "tupledb/SQLiteOkv"

const db = tupleDb(tupleOkv(new SQLiteOkv(sqlite(":memory:"))))
```
