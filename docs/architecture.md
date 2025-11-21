# Architecture

## Core Principles

### Monorepo Structure
All code lives in `/src` with clear package boundaries. The project uses absolute imports between packages and relative imports within packages.

### No Side Effects on Import
**Critical principle**: Only entry points produce side effects on import:
- Server: `/src/server/server.ts`
- Client: `/src/client/client.tsx`

All other files are pure utilities, components, or definitions. This enables:
- Safe code reuse across server and client
- Testability without complex mocking
- Predictable module loading

### Environment Injection
Instead of globals or singletons, all services are bundled in environment objects and passed explicitly:

**Server side**: `ServerEnvironment` contains `config`, `db`, `pubsub`, `enqueue`
**Client side**: `ClientEnvironment` contains `config`, `router`, `api`, `pubsub`, `prefs`, `cache`, `cmd`

Entry points create these environment objects and pass them through the application.

## Data Flow

### Write Flow
```
Client Hook (useWrite)
  → Optimistic cache update
  → POST /api/write
  → Server handler
  → TupleDB write
  → SQLite persist
  → Pubsub broadcast
  → WebSocket to clients
  → Cache update
  → React re-render
```

### Query Flow
```
Client Hook (useList)
  → Check local cache
  → Subscribe for updates
  → POST /api/list (if cache miss)
  → Server query
  → Cache insert with range metadata
  → Return local + remote results
```

### Background Tasks
```
Enqueue task with runAt time
  → QueueDatabase stores in tuple format
  → QueueServer polls for ready tasks
  → Execute handler with environment
  → Mark complete or retry on failure
```

## Layered Architecture

### Client Stack
```
React Components
  ↓
Custom Hooks (useList, useWrite, useLoader)
  ↓
ClientEnvironment (api, cache, pubsub)
  ↓
Network Layer (HTTP + WebSocket)
```

### Server Stack
```
Express HTTP Server
  ↓
ApiServer (validation + routing)
  ↓
API Handlers (business logic)
  ↓
TupleDB (data abstraction)
  ↓
SQLite (persistence)
```

### TupleDB Stack
```
OKV (Ordered Key-Value interface)
  ↓
TupleOKV (tuple encoding/decoding)
  ↓
TupleDb (convenience API)
  ↓
TupleTx (transaction support)
```

## Design Patterns

### Factory Functions
Services are created via factory functions rather than classes:
- `tupleDb(tupleOkv(new SQLiteOkv(...)))`
- `tupleOkv(okv)`
- `tupleTx(db)`

### Observer Pattern
Pubsub for real-time updates. Server publishes changes, clients subscribe to key prefixes.

### Optimistic Updates
Client cache immediately applies writes locally, then syncs with server. Rollback on failure.

### Command Pattern
Background tasks are commands with handlers. Queue system manages scheduling and execution.

## Module Organization

### Package Boundaries
Each top-level directory in `/src` is a logical package:
- `/src/api` - API framework
- `/src/auth` - Authentication
- `/src/client` - React frontend
- `/src/server` - Express backend
- `/src/database` - Schema definitions
- `/src/tupledb` - Database implementation
- `/src/shared` - Pure utilities
- `/src/ui` - Component library

See each package's README for details.

### Inter-package Dependencies
Packages may depend on:
- `/src/shared` (utilities, no dependencies)
- `/src/tupledb` (database abstraction)
- Type definitions from other packages

Circular dependencies between packages are not allowed. Use `npm run check-imports` to verify.
