import * as fs from "fs-extra"
import type { Server } from "http"
import Primus from "primus"
import { ClientPubsubMessage, ServerPubsubMessage } from "../shared/PubSubTypes"
import { path } from "./path"

export class WebsocketPubsub {
	private primus: Primus
	private connections = new Map<Primus.Spark, Set<string>>()

	constructor(server: Server) {
		this.primus = new Primus(server)

		// TODO: don't generate this file every time?
		if (false) {
			fs.writeFileSync(path("src/client/primuslib.js"), this.primus.library())
		}

		this.primus.on("connection", (connection) => {
			const subscriptions = new Set<string>()
			this.connections.set(connection, subscriptions)

			connection.on("end", () => {
				this.connections.delete(connection)
			})

			connection.on("data", (message: ClientPubsubMessage) => {
				// TODO: validate incoming data.
				if (message.type === "subscribe") {
					return subscriptions.add(message.key)
				}
				if (message.type === "unsubscribe") {
					return subscriptions.delete(message.key)
				}
			})
		})
	}

	async publish(items: { key: string; value: any }[]) {
		for (const [connection, subscriptions] of this.connections.entries()) {
			for (const { key, value } of items) {
				if (subscriptions.has(key)) {
					const message: ServerPubsubMessage = { type: "update", key, value }
					connection.write(message)
				}
			}
		}
	}
}
