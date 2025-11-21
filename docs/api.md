# API Development

See `/src/api/README.md` for comprehensive API framework documentation.

## Creating an API Endpoint

1. Create `/src/server/apis/yourEndpoint.ts`
2. Export `input` validation schema and `handler` function
3. Codegen automatically updates `/src/server/apis/index.ts`
4. Client can call via `api.yourEndpoint(args)`

## Handler Structure

```typescript
import * as t from "shared/DataType"
import type { ServerEnvironment } from "server/services/ServerEnvironment"

// Define and validate input
export const input = t.object({
  userId: t.number,
  message: t.string
})

// Handler receives validated args
export async function handler(
  env: ServerEnvironment,
  args: t.Infer<typeof input>,
  req: Request,
  res: Response
) {
  // Access services via environment
  const user = env.db.get(["users", args.userId])

  // Return data (auto-serialized to JSON)
  return { success: true, user }
}
```

## Input Validation

Use DataType schemas for type-safe validation:
```typescript
export const input = t.object({
  required: t.string,
  optional: t.optional(t.number),
  array: t.array(t.string),
  union: t.union(t.literal("a"), t.literal("b")),
  nested: t.object({
    field: t.boolean
  })
})
```

Invalid requests return 400 errors automatically.

## Authentication

Check authentication in handlers:
```typescript
import { getCurrentUser } from "auth/server"

export async function handler(env: ServerEnvironment, args, req, res) {
  const user = getCurrentUser(env, req)
  if (!user) {
    throw new UnauthorizedError("Not logged in")
  }

  // Use user.id, user.username, etc.
}
```

## Error Handling

Throw typed errors for consistent responses:
```typescript
import { NotFoundError, BadRequestError, UnauthorizedError } from "shared/errors"

export async function handler(env: ServerEnvironment, args) {
  const user = env.db.get(["users", args.userId])
  if (!user) {
    throw new NotFoundError("User not found")
  }
  return user
}
```

## Client Usage

The API client is automatically typed from server definitions:
```typescript
import { useClientEnvironment } from "client/services/ClientEnvironment"

function MyComponent() {
  const { api } = useClientEnvironment()

  const result = await api.yourEndpoint({
    userId: 123,
    message: "Hello"
  })

  // result is typed based on handler return type
}
```

Use hooks for better integration:
```typescript
const result = useLoader("key", async () => {
  return await api.yourEndpoint(args)
})
```

## Response Handling

Handlers can return:
- Plain objects (serialized to JSON)
- Strings (sent as text)
- Void (204 No Content)
- Custom responses via `res.send()`

## File Uploads

For file uploads, see `/src/upload/README.md` for the signed URL system.

## Real-Time Updates

After database writes, broadcast changes via pubsub:
```typescript
export async function handler(env: ServerEnvironment, args) {
  const newValue = { id: 1, name: "Updated" }

  // Write to database
  env.db.set(["users", 1], newValue)

  // Broadcast to subscribed clients
  env.pubsub.publish([{
    key: ["users", 1],
    value: newValue
  }])

  return { success: true }
}
```

Clients subscribed to `["users"]` prefix will receive updates automatically.
