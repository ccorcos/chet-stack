# Pubsub

Publishing and subscribing to keys over a websocket is a common piece of infrastructure. Redis is a great choice for this, but is a minimal implementation using a simple websocket server.

## WebsocketPubsubServer

Handles subscriptions and publishing to connected clients.

```ts
import express from "express"
import http from "node:http"
import { WebsocketPubsubServer } from "pubsub/WebsocketPubsubServer"

const app = express()

const server = http.createServer(app)
const pubsub = new WebsocketPubsubServer(server)

// Publish multiple items
pubsub.publish([
	{ key, value },
	{ key, value },
])
```

## WebsocketPubsubClient

The websocket client handle connecting and reconnecting when the connection drops from the browser.

```ts
import { WebsocketPubsubClient } from "pubsub/WebsocketPubsubClient"

const pubsub = new WebsocketPubsubClient()

pubsub.subscribe(key)
pubsub.unsubscribe(key)
pubsub.publish({ key, value })
pubsub.onMessage(({ key, value }) => {
	// handle message
})
```
