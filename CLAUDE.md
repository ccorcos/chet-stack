# Commands

```bash
npm run dev          # Start development server
npm run typecheck    # Check TypeScript types
npm run test:unit    # Run unit tests (Mocha)
npm run test:e2e     # Run E2E tests (Playwright)
```

## Coding Practices

- Use named exports with globally unique names instead of default.
- Absolute imports across packages, relative imports within packages.
- Delete unused code.
- Simple and terse is best. Avoid over-abstraction. Favor vanilla syntax.
- Try to use positive if-assertions instead of negative.
- When function arguments are ambiguous, use named arguments.
- No side effects on import, only the program entry points (e.g. `server/server.ts`, `client/client.tsx`) produce side effects, and use the `environment` pattern for dependency injection.
- Use `tupledb` for frontne

## Process
- Keep a running list of todos to keep track of loose ends.
- Write unit tests

## Overview
Top-level packages live in `src/<package>` directory and build outputs to `build/<pacakge>`

Each package has its own detailed documentation.

These packages are meant to be generic and not application-specific. `auth` and `upload` apis do make some assumptions about the database schema.
- `/src/api/README.md` - Type-safe API framework
- `/src/auth/README.md` - Authentication system
- `/src/codegen/README.md` - Code generation
- `/src/lint/README.md` - Import conventions and linting
- `/src/pubsub/README.md` - Real-time messaging
- `/src/queue/README.md` - Background task queue
- `/src/tupledb/README.md` - Database implementation (comprehensive)
- `/src/ui/README.md` - UI component library
- `/src/upload/README.md` - File upload system

These are the main application-specific packages
- `/src/client/README.md` - Frontend architecture
- `/src/database/README.md` - Database schemas
- `/src/server/README.md` - Backend architecture


## Creating an API

1. Create /src/server/apis/endpoint.ts
2. Export input schema and handler function
3. Codegen auto-updates types
4. Client calls via api.endpoint(args)

## Querying Database
```ts
// Server: Direct access
const user = db.get(["users", userId])

// Client: Use hooks
const { localResult, remoteResult } = useList({
  gte: ["users"],
  lte: ["users", "\xff"]
})
```

## Background Tasks

1. Create /src/server/tasks/taskName.ts
2. Export async handler function
3. Codegen auto-updates types
4. Enqueue: environment.enqueue.taskName(args, {runAt})

## More documentation
- **Testing**: `docs/testing.md` - Unit and E2E test setup
- **Infrastructure**: `docs/infra.md` - Deployment and server setup
