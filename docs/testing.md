> A good architecture is one that can accomodate changes in requirements easily.
> – Uncle Bob's Clean Code Lectures

There are two kinds of tests.

`npm run test:unit` will run unit tests – any file that ends in `.test.ts` – using Mocha. Check out `base.test.ts` to see what a simple unit test looks like. You can copy this file to make new test in another file. Note that you actually need to import from `mocha` which prevents test types from polluting the rest of the project.

`npm run test:e2e` will run end-to-end browser tests – any file that ends in `.e2e.ts` – using Playwright. Check out `base.e2e.ts` to see how end-to-end tests work.
