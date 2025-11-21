## Commands

```bash
npm run dev          # Start development server
npm run lint         # Full linting pipeline
npm run typecheck    # Check TypeScript types
npm run test:unit    # Run unit tests (Mocha)
npm run test:e2e     # Run E2E tests (Playwright)
```

## Documentation

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

## Quick Reference

### Creating an API

1. Create /src/server/apis/endpoint.ts
2. Export input schema and handler function
3. Codegen auto-updates types
4. Client calls via api.endpoint(args)

### Querying Database
```ts
// Server: Direct access
const user = db.get(["users", userId])

// Client: Use hooks
const { localResult, remoteResult } = useList({
  gte: ["users"],
  lte: ["users", "\xff"]
})
```

### Background Tasks

1. Create /src/server/tasks/taskName.ts
2. Export async handler function
3. Codegen auto-updates types
4. Enqueue: environment.enqueue.taskName(args, {runAt})

## Before Making Changes

1. Read relevant docs above for context
2. Check package README if working in specific module

## Additional Resources

- Main README: `/README.md` - Project overview
