# Common Workflows

## Adding a New API Endpoint

1. Create file: `/src/server/apis/myEndpoint.ts`

2. Define validation and handler:
```typescript
import * as t from "shared/DataType"
import type { ServerEnvironment } from "server/services/ServerEnvironment"

export const input = t.object({
  userId: t.number
})

export async function handler(
  env: ServerEnvironment,
  args: t.Infer<typeof input>
) {
  const user = env.db.get(["users", args.userId])
  return user
}
```

3. Codegen auto-updates `/src/server/apis/index.ts`

4. Use from client:
```typescript
const { api } = useClientEnvironment()
const user = await api.myEndpoint({ userId: 123 })
```

See: `docs/api.md`

## Adding a Background Task

1. Create file: `/src/server/tasks/myTask.ts`

2. Define handler:
```typescript
import type { ServerEnvironment } from "server/services/ServerEnvironment"

export async function myTask(
  env: ServerEnvironment,
  args: { message: string }
) {
  console.log("Task running:", args.message)
  // Do work
}
```

3. Codegen auto-updates task types

4. Enqueue task:
```typescript
await env.enqueue.myTask(
  { message: "Hello" },
  { runAt: Date.now() + 60000 } // Run in 1 minute
)
```

See: `/src/queue/README.md`

## Adding a Database Schema

1. Define schema in `/src/database/schema.ts`:
```typescript
export const USER_KEY = ["users", t.number] as const
export const USER_VALUE = t.object({
  id: t.number,
  username: t.string,
  email: t.string
})
```

2. Create helpers in `/src/database/user.ts`:
```typescript
export function getUser(db: TupleDb, userId: number) {
  return db.get(["users", userId])
}

export function listUsers(db: TupleDb) {
  return db.list({
    gte: ["users"],
    lte: ["users", "\xff"]
  })
}
```

3. Use in handlers:
```typescript
import { getUser } from "database/user"

export async function handler(env: ServerEnvironment, args) {
  return getUser(env.db, args.userId)
}
```

See: `docs/database.md`

## Creating a React Component

1. Create file in appropriate location:
   - App-specific: `/src/client/components/MyComponent.tsx`
   - Reusable: `/src/ui/components/MyComponent.tsx`

2. Define component:
```typescript
import { useClientEnvironment } from "client/services/ClientEnvironment"

export function MyComponent() {
  const { api } = useClientEnvironment()

  return <div>...</div>
}
```

3. Use database hooks if needed:
```typescript
import { useList } from "client/hooks/useDatabase"

const { localResult, remoteResult } = useList({
  gte: ["users"],
  lte: ["users", "\xff"]
})
```

See: `docs/client.md`

## Running Database Migration

1. Create migration file: `/src/server/migrations/001_description.ts`

2. Define migration:
```typescript
import type { TupleDb } from "tupledb/TupleDb"

export async function migrate(db: TupleDb) {
  const users = db.list({
    gte: ["users"],
    lte: ["users", "\xff"]
  })

  for (const {key, value} of users) {
    // Transform data
    value.newField = "default"
    db.set(key, value)
  }
}
```

3. Run migration:
```
npm run migrate
```

See: `docs/database.md`

## Adding Real-Time Updates

1. Server: Publish changes after write:
```typescript
export async function handler(env: ServerEnvironment, args) {
  const value = { id: 1, name: "Updated" }

  env.db.set(["users", 1], value)

  // Broadcast to clients
  env.pubsub.publish([{
    key: ["users", 1],
    value: value
  }])

  return { success: true }
}
```

2. Client: Use hooks (automatic subscription):
```typescript
const { localResult, remoteResult } = useList({
  gte: ["users"],
  lte: ["users", "\xff"]
})

// Component re-renders when server publishes updates
```

See: `/src/pubsub/README.md`

## Fixing Import Issues

### Auto-fix all imports
```
npm run fix-imports
```

This enforces:
- Absolute imports between packages
- Relative imports within packages
- `node:` prefix for native modules

### Check for circular dependencies
```
npm run check-imports
```

See: `docs/conventions.md` and `/src/lint/README.md`

## Running Tests

### Unit tests
```
npm run test:unit
```

Tests live next to source files: `file.test.ts`

### E2E tests
```
npm run test:e2e
```

Tests match pattern: `file.e2e.ts`

See: `docs/testing.md`

## Full Lint Pipeline

Run all checks before committing:
```
npm run lint
```

This runs:
1. Code generation
2. Import fixes
3. Prettier formatting
4. TypeScript type checking

## Resetting Development Environment

### Clear database
```
npm run reset
```

### Fresh start
```
npm run reset
npm run migrate
npm run dev
```

## Production Deployment

See: `docs/infra.md`

Quick version:
```
systemctl stop app
git pull
npm install
npm run migrate
systemctl start app
```
