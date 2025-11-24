> A good architecture is one that can accomodate changes in requirements easily.
> – Uncle Bob's Clean Code Lectures

There are two kinds of tests.

`npm run test:unit` will run unit tests – any file that ends in `.test.ts` using Mocha. The `base.test.ts` file is a template for what unit test looks like.

`npm run test:e2e` will run end-to-end browser tests using playwright - any file that ends in `.e2e.ts`. The `base.e2e.ts` file is a template for how end-to-end tests work.

The best practice for e2e tests is to abstract all the interaction with the browser behind functions that explain what's actually happening. That way e2e tests read like plain-english.

