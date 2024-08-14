import { fromSubscriptionKey } from "../shared/PubSubKeys"
import { DatabaseApi } from "./services/Database"
import { ServerConfig } from "./services/ServerConfig"
import { WebsocketPubsubServer } from "./services/WebsocketPubsubServer"

// Turn on request logging.
// https://expressjs.com/en/guide/debugging.html
// process.env.DEBUG = "express:*"

import type { Server } from "http"

export function PubsubServer(
	environment: { config: ServerConfig; db: DatabaseApi },
	server: Server
) {
	return new WebsocketPubsubServer(server, async function (key) {
		const sub = fromSubscriptionKey(key)

		if (sub.type === "getRecord") {
			const pointer = sub.pointer
			const record = await environment.db.getRecord(pointer)
			if (!record) return
			// TODO: publish only to client who's subscribing, not to everyone.
			this.publish([{ key, value: record.version }])
		}

		if (sub.type === "getMessages") {
			// TODO: we should persist some kind of cursor.
		}
	})
}
