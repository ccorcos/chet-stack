import { WebsocketPubsubServer } from "./services/WebsocketPubsubServer"

// Turn on request logging.
// https://expressjs.com/en/guide/debugging.html
// process.env.DEBUG = "express:*"

import type { Server } from "http"

export function PubsubServer(environment: {}, server: Server) {
	return new WebsocketPubsubServer(server, async function (key) {
		// this.publish([{ key, value }])
	})
}
