# Chet Stack - AI Assistant Guide

Full-stack TypeScript application with React frontend, Express backend, and custom TupleDB database layer.

## Quick Commands

```bash
npm run dev          # Start development server
npm run typecheck    # Check TypeScript types
npm run test:unit    # Run unit tests (Mocha)
npm run test:e2e     # Run E2E tests (Playwright)
npm run lint         # Full linting pipeline
npm run fix-imports  # Auto-fix import conventions
npm run prettier     # Format code
```

## Documentation

### Core Concepts
- **Architecture**: `docs/architecture.md` - Monorepo structure, environment injection, data flow, layered architecture
- **Conventions**: `docs/conventions.md` - Import rules, naming, code style, file organization

### Development Guides
- **API Development**: `docs/api.md` - Creating endpoints, validation, authentication, error handling
- **Database Usage**: `docs/database.md` - TupleDB operations, schemas, queries, migrations
- **Client Development**: `docs/client.md` - React hooks, routing, real-time updates, UI components
- **Common Workflows**: `docs/workflows.md` - Step-by-step guides for common tasks

### Operations
- **Testing**: `docs/testing.md` - Unit and E2E test setup
- **Infrastructure**: `docs/infra.md` - Deployment and server setup

### Package Documentation
Each package has detailed documentation:
- `/src/api/README.md` - Type-safe API framework
- `/src/auth/README.md` - Authentication system
- `/src/client/README.md` - Frontend architecture
- `/src/codegen/README.md` - Code generation
- `/src/database/README.md` - Database schemas
- `/src/lint/README.md` - Import conventions and linting
- `/src/pubsub/README.md` - Real-time messaging
- `/src/queue/README.md` - Background task queue
- `/src/server/README.md` - Backend architecture
- `/src/tupledb/README.md` - Database implementation (comprehensive)
- `/src/ui/README.md` - UI component library
- `/src/upload/README.md` - File upload system

## Directory Structure

```
/src
├── api/          Type-safe API framework
├── auth/         Authentication system
├── client/       React frontend (entry: client.tsx)
├── codegen/      Code generation
├── database/     Database schemas
├── lint/         Import linting tools
├── pubsub/       Real-time WebSocket messaging
├── queue/        Background task queue
├── server/       Express backend (entry: server.ts)
│   ├── apis/     API endpoint handlers
│   └── tasks/    Background task handlers
├── shared/       Pure utilities (35+ files)
├── tools/        CLI utilities
├── tupledb/      Custom database implementation
├── ui/           React component library
└── upload/       File upload system
```

## Key Principles

1. **No side effects on import** - Only `server/server.ts` and `client/client.tsx` produce side effects
2. **Environment injection** - All services accessed via ServerEnvironment/ClientEnvironment
3. **TupleDB** - Ordered key-value store with tuple keys as core data layer
4. **Type safety** - DataType schema validation throughout
5. **Real-time sync** - WebSocket pubsub with optimistic updates
6. **Absolute imports between packages** - Relative imports within packages

## Quick Reference

### Creating an API
```
1. Create /src/server/apis/endpoint.ts
2. Export input schema and handler function
3. Codegen auto-updates types
4. Client calls via api.endpoint(args)
```
Details: `docs/workflows.md` and `docs/api.md`

### Querying Database
```typescript
// Server: Direct access
const user = env.db.get(["users", userId])

// Client: Use hooks
const { localResult, remoteResult } = useList({
  gte: ["users"],
  lte: ["users", "\xff"]
})
```
Details: `docs/database.md`

### Background Tasks
```
1. Create /src/server/tasks/taskName.ts
2. Export async handler function
3. Enqueue: env.enqueue.taskName(args, {runAt})
```
Details: `docs/workflows.md` and `/src/queue/README.md`

### Import Conventions
```typescript
// Between packages: absolute from src/
import { api } from "api/client"

// Within package: relative
import { helper } from "./helpers"

// Node modules: node: prefix
import { readFile } from "node:fs/promises"
```
Details: `docs/conventions.md` and `/src/lint/README.md`

## Tech Stack

**Backend**: Node.js 22, Express 5, SQLite (better-sqlite3), WebSocket (ws)
**Frontend**: React 19, Vite 7
**Testing**: Mocha (unit), Playwright (E2E)
**Language**: TypeScript 5.9

## Before Making Changes

1. Read relevant docs above for context
2. Check package README if working in specific module
3. Run `npm run typecheck` to verify types
4. Run appropriate tests
5. Run `npm run lint` before committing

## Additional Resources

- Main README: `/README.md` - Project overview
- TODO tracking: `/TODO.md`
- Developer notes: `/NOTES.md`
