# Code Conventions

## Import Rules

See `/src/lint/README.md` for complete details.

### Between Packages
Use absolute imports from `src/`:
```typescript
import { someApi } from "api/client"
import * as t from "shared/DataType"
import { tupleDb } from "tupledb/TupleDb"
```

### Within Same Package
Use relative imports:
```typescript
import { helper } from "./helpers"
import { UserTable } from "../components/UserTable"
```

### Native Node Modules
Use `node:` prefix:
```typescript
import { scrypt } from "node:crypto"
import path from "node:path"
import { readFile } from "node:fs/promises"
```

### Auto-fix Imports
```
npm run fix-imports
```

### Check Imports
Detect circular dependencies and import leaks:
```
npm run check-imports
```

## File Naming

- `*.ts` - TypeScript source files
- `*.tsx` - React components
- `*.test.ts` - Mocha unit tests
- `*.e2e.ts` - Playwright E2E tests
- `*.gen.ts` - Code generators (auto-run on change)
- `index.ts` - Re-exports (usually auto-generated)

## Code Style

### Formatting
Use Prettier with these settings:
- Tabs (not spaces)
- 100 character line width
- Semicolons required
- Single quotes for strings

Run: `npm run prettier`

### TypeScript
- Strict null checks enabled
- Explicit return types on public APIs
- Infer types locally
- Use `type` over `interface` for consistency

### Exports
Export what's needed, keep internals private:
```typescript
// Public API
export function publicFunction() { }

// Internal helper (not exported)
function internalHelper() { }
```

## Naming Conventions

### Variables & Functions
```typescript
// camelCase for variables and functions
const userName = "Alice"
function getUserData() { }
```

### Types & Interfaces
```typescript
// PascalCase for types
type UserData = { id: number, name: string }
type ServerEnvironment = { db: TupleDb }
```

### Constants
```typescript
// UPPER_CASE for true constants
const MAX_RETRIES = 3
const API_TIMEOUT = 5000

// camelCase for configuration objects
const serverConfig = { port: 8080 }
```

### Files
```typescript
// PascalCase for components
UserList.tsx
Button.tsx

// camelCase for utilities
formatDate.ts
apiClient.ts

// PascalCase for classes/main exports
TupleDb.ts
ApiServer.ts
```

## Code Organization

### API Handlers
```typescript
// /src/server/apis/endpoint.ts
export const input = t.object({ /* validation */ })
export async function handler(env, args, req, res) { /* logic */ }
```

### Task Handlers
```typescript
// /src/server/tasks/taskName.ts
export async function taskName(env: ServerEnvironment, args) { /* logic */ }
```

### React Components
```typescript
// /src/client/components/ComponentName.tsx
export function ComponentName(props) {
  return <div>...</div>
}
```

### Utilities
```typescript
// /src/shared/utilityName.ts
export function utilityName() { }
```

## Comments

Only comment what's not obvious from the code:
```typescript
// Good: Explains why
// Use scrypt instead of bcrypt for better security on modern hardware
await scrypt(password, salt)

// Bad: Explains what (code is self-explanatory)
// Set the user's name to "Alice"
user.name = "Alice"
```

## Error Handling

Use typed errors from `/src/shared/errors.ts`:
```typescript
import { NotFoundError, BadRequestError, UnauthorizedError } from "shared/errors"

if (!user) {
  throw new NotFoundError("User not found")
}
```

## Async/Await

Prefer async/await over promise chains:
```typescript
// Good
async function fetchUser(id: number) {
  const user = await api.getUser(id)
  return user
}

// Avoid
function fetchUser(id: number) {
  return api.getUser(id).then(user => user)
}
```

## No Side Effects

Files should not produce side effects on import, except:
- `/src/server/server.ts`
- `/src/client/client.tsx`

All other files should be pure definitions.

## Testing

Test file next to source:
```
/src/shared/DataType.ts
/src/shared/DataType.test.ts
```

Keep tests simple and focused.
