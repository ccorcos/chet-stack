# Client Development

## React Setup

Entry point: `/src/client/client.tsx`

The app uses:
- React 19
- Vite for dev server and bundling
- Client-side routing
- Real-time data sync with optimistic updates

## ClientEnvironment

Access services via the `useClientEnvironment` hook:
```typescript
import { useClientEnvironment } from "client/services/ClientEnvironment"

function MyComponent() {
  const { api, cache, pubsub, router, prefs, cmd } = useClientEnvironment()
  // Use services
}
```

Available services:
- `api` - Typed API client
- `cache` - Local query cache
- `pubsub` - WebSocket for real-time updates
- `router` - Client-side routing
- `prefs` - localStorage wrapper
- `cmd` - Command service
- `config` - Client configuration

## Database Hooks

### Querying Data
```typescript
import { useList } from "client/hooks/useDatabase"

function UserList() {
  const { localResult, remoteResult } = useList({
    gte: ["users"],
    lte: ["users", "\xff"]
  })

  // localResult: from cache (instant)
  // remoteResult: from server (async)

  const users = remoteResult.value || localResult

  return <div>
    {users.map(({key, value}) => (
      <div key={key}>{value.username}</div>
    ))}
  </div>
}
```

### Writing Data
```typescript
import { useWrite } from "client/hooks/useDatabase"

function UpdateUser() {
  const write = useWrite()

  async function handleUpdate() {
    await write({
      set: [
        [["users", userId], { name: "New Name" }]
      ]
    })
    // Cache updated optimistically
    // Server synced in background
  }

  return <button onClick={handleUpdate}>Update</button>
}
```

## Async Operations

Use `useLoader` for async operations with loading states:
```typescript
import { useLoader } from "client/hooks/useLoader"

function DataComponent() {
  const result = useLoader("unique-key", async () => {
    const response = await api.fetchSomething()
    return response.data
  })

  if (result.loading) return <div>Loading...</div>
  if (result.error) return <div>Error: {result.error.message}</div>
  return <div>Data: {result.value}</div>
}
```

## Routing

Add routes in `/src/client/client.tsx`:
```typescript
<Route path="/users" element={<UserList />} />
<Route path="/users/:id" element={<UserDetail />} />
```

Navigate programmatically:
```typescript
const { router } = useClientEnvironment()
router.navigate("/users/123")
```

## Local Preferences

Store user preferences in localStorage:
```typescript
const { prefs } = useClientEnvironment()

// Get preference
const theme = prefs.get("theme", "light")

// Set preference
prefs.set("theme", "dark")

// Subscribe to changes
useEffect(() => {
  return prefs.subscribe("theme", (newTheme) => {
    console.log("Theme changed:", newTheme)
  })
}, [])
```

## Real-Time Updates

Components using `useList` automatically receive real-time updates via WebSocket. No additional code needed.

The pubsub system:
1. Client subscribes to key prefixes (e.g., `["users"]`)
2. Server publishes changes after writes
3. Client cache updates
4. React re-renders automatically

## UI Components

Use components from `/src/ui/components/`:
```typescript
import { Button } from "ui/components/Button"
import { Modal } from "ui/components/Modal"
import { Table } from "ui/components/Table"

// See /src/ui/README.md for full list
```

Components are self-contained with minimal dependencies.

## Styling

The app uses plain CSS with CSS variables for theming:
- `var(--bg0)`, `var(--bg1)`, `var(--bg2)` - Background colors
- `var(--fg0)`, `var(--fg1)`, `var(--fg2)` - Foreground colors
- `var(--accent)` - Accent color

Import CSS files:
```typescript
import "./MyComponent.css"
```

## Performance

- **Optimistic updates**: UI responds instantly to writes
- **Cache layer**: Local data available immediately
- **Subscriptions**: Only re-render when data changes
- **Code splitting**: Vite automatically splits routes

## Development

Start dev server:
```
npm run dev
```

Access at `http://localhost:8080`

Hot reload is enabled for instant feedback.
