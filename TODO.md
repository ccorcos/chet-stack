
- service worker for offline html, js, and css assets.
- offline transaction queue

- permissions checking on reads and writes.
- proper where query for threads and messages.

- queue tasks
	- what's a rock solid solution for denormalization stuff write()?

- react suspense flashing.

- undo/redo
- better typescript types.

---

Dev improvements...

- server and client watch
- source maps

- import assertions, no importing server from app, etc.
- morgan logging and helmet

- recordMapHelpers types.

---

Sometime much later...
- rate limiting
- file uploading


---

```ts

await postgres.insert(data)
await elasticsearch.index(data)
await redis.publish(data)

// Uses a queue.

await storage.write(txId, {before, after})
await Promise.all([
	queue.enqueue({txId, type: "elasticsearch.index"}),
	queue.enqueue({txId, type: "redis.publish"}),
])
```



---

Postgres query for transactional upsert:

```sql
-- insert a new record
INSERT INTO users (id, name, version, last_version)
VALUES ($id, $name, $version, $last_version)
-- update the record if it exists
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  version = EXCLUDED.version,
  last_version = EXCLUDED.last_version
-- assert that the current version is the same as the new last_version.
WHERE users.version = EXCLUDED.last_version;
```