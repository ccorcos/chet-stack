# Lint

Utilities for maintaining an organized and clean codebase.

## fixImports

There are three conventions we enforce. `src/*` are considered top-level packages.

- When importing across packages, we should not use relative imports.
- When importing within packages, we should always use relative imports.
- When importing native node packages, we should always use node qualified imports.

## checkImports

There are two important things we're looking for.

- Are there any circlular imports that can create runtime errors that are not caught by the typechecker?
- Are there any import dependencies that can leak sensitive server code to the frontend when bundling?
