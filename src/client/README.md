# Client

Using vite for build system and React for rendering.

All generic client side code lives in the `src/ui` package. This package is only for application-specific code.

The only file with side-effects is the `client.tsx` file which constructs the `ClientEnvironment` and passed that environment around the application.

The ClientEnvironment defined interfaces with external services and side-effects so that they can be swapped out later as needed.

For application-specific demos, you can add to `src/client/demos` which is useful for testing different ideas.

For state management, we try to stick with vanilla React state as much as possible. Occasionally, we may reach for `src/ui/hooks/useStore`. And occasionally, we'll store state in the services themselves when it makes sense such as with `src/ui/services/Router`.

For global state management, should you need it, create a TupleDb Cache as a service and store state there.
