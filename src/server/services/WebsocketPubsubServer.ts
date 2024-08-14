import type { Server } from "http"
import WebSocket from "ws"
import { ClientPubsubMessage, ServerPubsubMessage } from "../../shared/PubSubTypes"

const debug = (...args: any[]) => console.log("pubsub:", ...args)

export type PubsubApi = {
	publish(items: { key: string; value: any }[]): Promise<void>
}

// TODO: sticky sessions.
export class WebsocketPubsubServer implements PubsubApi {
	private wss: WebSocket.Server
	private connections = new Map<WebSocket, Set<string>>()

	constructor(server: Server, onSubscribe: (this: PubsubApi, key: string) => void) {
		this.wss = new WebSocket.Server({ server })

		this.wss.on("connection", (connection) => {
			const subscriptions = new Set<string>()
			this.connections.set(connection, subscriptions)

			connection.on("close", () => {
				this.connections.delete(connection)
			})

			connection.on("message", (data: string) => {
				const message = JSON.parse(data) as ClientPubsubMessage

				debug("<", message.type, message.key)

				// TODO: validate incoming data.
				if (message.type === "subscribe") {
					subscriptions.add(message.key)
					onSubscribe.call(this, message.key)
					return
				}
				if (message.type === "unsubscribe") {
					subscriptions.delete(message.key)
					return
				}
			})
		})
	}

	async publish(items: { key: string; value: any }[]) {
		for (const { key, value } of items) {
			const message: ServerPubsubMessage = { type: "update", key, value }
			debug(">", message.type, message.key, message.value)
			const data = JSON.stringify(message)

			for (const [connection, subscriptions] of this.connections.entries()) {
				if (subscriptions.has(key)) {
					connection.send(data)
				}
			}
		}
	}
}
