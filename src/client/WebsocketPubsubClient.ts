import { DeferredPromise } from "../shared/DeferredPromise"
import { ClientPubsubMessage, ServerPubsubMessage } from "../shared/PubSubTypes"
import { ClientConfig } from "./ClientConfig"

const debug = (...args: any[]) => console.log("pubsub:", ...args)

export class WebsocketPubsubClient {
	private ws: WebSocket
	private ready = new DeferredPromise<void>()

	constructor(args: { config: ClientConfig; onChange: (key: string, value: any) => void }) {
		this.ws = new WebSocket(`ws://${args.config.host}`)

		this.ws.onopen = () => this.ready.resolve()

		this.ws.onmessage = (event) => {
			const message = JSON.parse(event.data) as ServerPubsubMessage
			debug("<", message.type, message.key, message.value)
			args.onChange(message.key, message.value)
		}

		// TODO: reconnect, etc.
		// this.ws.onerror
		// this.ws.onclose
	}

	private async send(message: ClientPubsubMessage) {
		await this.ready.promise
		debug(">", message.type, message.key)
		this.ws.send(JSON.stringify(message))
	}

	subscribe(key: string) {
		this.send({ type: "subscribe", key })
	}

	unsubscribe(key: string) {
		this.send({ type: "unsubscribe", key })
	}
}
