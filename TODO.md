
- getMessages
	- should work offline
	- display status of being sent or not
	- display status of loaded from cache or most recent from network
	- delayed unsubscribe for getMessages
	- pagination

- getThreads

- proper where query for threads and messages.
	- paging and custom reactivity hook

- offline transaction queue
	- "offline mode" state detection

- QA document

- queue tasks
	- what's a rock solid solution for denormalization stuff write()?

- morgan logging and helmet, reject large request, rate limiting
- react suspense flashing.

- undo/redo
- file uploading


---

Dev improvements...

- source maps
- better typescript types.
- recordMapHelpers types.

- server and client watch

- import assertions, no importing server from app, etc.


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