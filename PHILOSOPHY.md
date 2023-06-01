/client is the app
/server is the backend
/shared is stuff that's shared between the two
/tools is just for devs.

The client and server should never import code from each other. Anything used by both should be in shared. And shared should never import from outside of shared. The one exception is that shared can import types from client/server so that both sides have access to those types.

Both the client and the server have an "environment" object that gets passed around everywhere. The entry points (client/index.tsx and server/server.ts) are the only files that have side-effects upon importing them. That is very important -- this architecture is very pure. You won't be importing the "database" from anywhere because if the database needs to connect, that would be a side-effect. Sure, that connection can happen lazily, but I prefer a functional style of coding where the execution of the program is very clear, predictable, and understandable. You should be able to step through the entry point of a file and have no surprises about what's happening.

On the server, in particular, the services on the environment are designed to be modular. The database service has an api dialect so that you can write your business logic in terms of that api while maintaining the ability to swap out the underlying database implementation with minimal plumbing. The same goes for pubsub. Both of these services are implemented with a minimal implementation that runs all on the same server, but it's not hard to imagine using Postgres for the database and Redis for the pubsub service at some point.

On the client, simplicity is the name of the game. Frontend is a lot more complex than people give credit to, which leads to a blossoming of various libraries and frameworks that tend to muddy the water. I'm happy with React, but otherwise, try to shy away from heavyweight patterns as much as possible. Even React-Router is a huge distraction, in my opinion -- the browser history api is so simple that you can do whatever you need with just a few lines of code.