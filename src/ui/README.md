# UI

A set of components and utilities for building user interfaces with React. This pacakge is meant to be self-contained and make minimal assumptions about the rest of the application.

- `src/ui/components/` are generic components. Simple components like `Button.tsx` and `Input.tsx` as well as advanced components like `FileUpload.tsx` and `ComboBox.tsx`.
- `src/ui/demos` demonstrate components and the various ways you can use them and their props. This is also useful during development for tweaking designs.
- `src/ui/helpers` has common helper functions for things like focus, scroll, and keyboard shortcuts.
- `src/ui/hooks` has React hooks helpers.
- `src/ui/services` for generic stateful services like a client-side router.

When creating new components, try to make them stateless (except for trivial state), and create a demo showing how its used.

You can boot up a minimal dev server with `npm run ui` to view the demos and experiments with various components.

For CSS, favor using inline styles in React. For more advanced CSS things, you can use `src/ui/helpers/css.ts` to write css rules. And we also have `client.css` for application-wide CSS styles and `theme.css` for handling colors and dark mode. Theme also has the `layer` class useful for overlays which will change all the underlying css variables.
