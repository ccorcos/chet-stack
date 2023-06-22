import type { Server } from "http"
import WebSocket from "ws"
import { ClientPubsubMessage, ServerPubsubMessage } from "../shared/PubSubTypes"

export class WebsocketPubsubServer {
	private wss: WebSocket.Server
	private connections = new Map<WebSocket, Set<string>>()

	constructor(server: Server) {
		this.wss = new WebSocket.Server({ server })

		this.wss.on("connection", (connection) => {
			const subscriptions = new Set<string>()
			this.connections.set(connection, subscriptions)

			connection.on("close", () => {
				this.connections.delete(connection)
			})

			connection.on("message", (data: string) => {
				const message = JSON.parse(data) as ClientPubsubMessage
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
					const data = JSON.stringify(message)
					connection.send(data)
				}
			}
		}
	}
}
