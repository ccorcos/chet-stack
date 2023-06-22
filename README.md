# Chet Stack

A spiritual successor to Meteor.js.

The goal here is to make it easy to start a new project, complete with all of the bells an whistles expected in a modern web application. This architecture is designed so that everything can run in a single process on a single server, while still being easy to scale up by breaking pieces out into separate services.

- cookie-based authentication
- realtime updates
- offline caching [Work in Progress]
- undo/redo support [Work in Progress]
- use whatever database you want (recommend Postgres).
- use whatever pub sub services you want (recommend Redis).

## Development

```sh
git clone git@github.com:ccorcos/typescript-boilerplate.git project
cd project
git remote remove origin
npm install
npm start
```
