import type { Server } from "node:http"
import * as t from "shared/DataType"
import { WebSocketServer } from "ws"
import { ClientMessage, ClientMessageSchema, ServerMessage } from "./types"

const debug = (...args: any[]) => console.log("pubsub:", ...args)

/** Basic pubsub with no authentication. */
export class WebsocketPubsubServer {
	private wss: WebSocketServer
	private connections = new Map<WebSocket, Set<string>>()

	constructor(server: Server) {
		this.wss = new WebSocketServer({ server })

		this.wss.on("connection", (connection) => {
			const subscriptions = new Set<string>()
			this.connections.set(connection, subscriptions)

			connection.on("close", () => {
				this.connections.delete(connection)
			})

			connection.on("message", (data: string) => {
				const message = JSON.parse(data) as ClientMessage
				if (!t.is(ClientMessageSchema, message)) {
					console.error("Invalid message format", message)
					return
				}

				debug("<", message.type, message.key)

				if (message.type === "subscribe") {
					subscriptions.add(message.key)
					return
				}
				if (message.type === "unsubscribe") {
					subscriptions.delete(message.key)
					return
				}
				if (message.type === "publish") {
					this.publish([{ key: message.key, value: message.value }])
					return
				}
			})
		})
	}

	async publish(items: { key: string; value: any }[]) {
		for (const { key, value } of items) {
			const message: ServerMessage = { type: "publish", key, value }
			debug(">", message.type, message.key, message.value)
			const data = JSON.stringify(message)
			for (const [connection, subscriptions] of this.connections.entries()) {
				if (subscriptions.has(key)) connection.send(data)
			}
		}
	}
}
