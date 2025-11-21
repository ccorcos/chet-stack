import { ClientMessage, ServerMessage } from "./types"
import { WebsocketClient } from "./WebsocketClient"

const debug = (...args: any[]) => console.log("pubsub:", ...args)

type Listener = (key: string, value: any) => void

export class WebsocketPubsubClient {
	private client: WebsocketClient

	constructor() {
		this.client = new WebsocketClient({
			onMessage: (input: string) => {
				const { type, key, value } = JSON.parse(input) as ServerMessage
				debug("<", type, key, value)
				this.emit(key, value)
			},
		})
	}

	private listeners: Set<Listener> = new Set()

	onMessage(listener: Listener) {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}

	private emit(key: string, value: any) {
		for (const listener of this.listeners) listener(key, value)
	}

	start() {
		this.client.start()
	}

	private sendJson(obj: ClientMessage) {
		this.client.send(JSON.stringify(obj))
	}

	subscribe(key: string) {
		this.sendJson({ type: "subscribe", key })
	}

	unsubscribe(key: string) {
		this.sendJson({ type: "unsubscribe", key })
	}

	publish(key: string, value: any) {
		this.sendJson({ type: "publish", key, value })
	}
}
