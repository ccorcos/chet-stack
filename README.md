# Chet Stack

> A boilerplate, not a framework.

The goal of this repo is to make it easy to start a new full-stack application, complete with all of the bells an whistles expected in a modern web application. The architecture is designed so that everything can run in a single process on a single server, while still being easy to scale up by breaking pieces out into separate services.


This is a stripped down version of ChetStack that makes it a little easier to get started. The entire data layer is removed allowing you to build your own to suit your needs. The tools for auth and file uploads remain in the repo but are unused because they typically depend on the data layer to work.

## Previous Versions

- Check out [🏷️ v0](https://github.com/ccorcos/chet-stack/tree/v0) to see a more complete implementation with an architecture very similar to the one I built for Notion.
	- cookie-based authentication 🍪
	- realtime updates ⚡️
	- offline mode 🖥️
	- undo/redo ↩️
	- end-to-end browser testing 🔧
	- runs in a single process + scales when you need to

## Features

- runs in a single process
- background task processing
- frontend router
- pubsub for realtime updates
- end to end browser testing

## Getting Started

```sh
git clone git@github.com:ccorcos/chet-stack.git project
cd project
git remote remove origin
npm install
npm start
```

- `npm run reset` to clear all data in your database
- `npm run typecheck` to check TypeScript types.
- `npm run test:unit` for unit tests with Mocha
- `npm run test:e2e` for unit tests with end-to-end tests with Playwright.

[Read the docs!](./DOCS.md)

## Contributing

Like any software project, this repo is never finished. It's meant to be a great place to start for building a bespoke application from the ground up. You're welcome to use it, but beware of dragons!

👋 If you're getting started / using ChetStack, then please reach out sometime! I'm here to help.
