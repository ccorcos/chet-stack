# Server

This server does a bunch of things all in one process. At some point, you maybe need to scale out to use more than one server for different pieces.

## Architecture

`server/server.ts` is the entry point and the only one that produces side-effects. It constructs the `ServerEnvironment` which is passed around the server a lot as a means of dependency injection. The `ServerEnvironment` should contain interfaces for interacting with other services, such as pubsub, queue, and database. This typed interface makes it easier to swap out implementations later as the application demands.

## All-in-one

We're using an embedded tupledb database.
we're running a queue database along with a queue server to process the queue.
We're running an upload server for managing user uploads.
We're running an api server.
And we're running a web server.
