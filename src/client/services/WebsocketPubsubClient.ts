import { ClientPubsubMessage, ServerPubsubMessage } from "../../shared/PubSubTypes"
import { SecondMs } from "../../shared/dateHelpers"
import { sleep } from "../../shared/sleep"
import { ClientConfig } from "./ClientConfig"

const debug = (...args: any[]) => console.log("pubsub:", ...args)

export class WebsocketPubsubClient {
	private ws: WebSocket
	private reconnectAttempt = 1

	constructor(
		private args: {
			config: ClientConfig
			onChange: (key: string, value: any) => void
			onStart: () => void
		}
	) {
		this.connect()

		window.addEventListener("online", () => {
			this.reconnectAttempt = 1
			this.connect()
		})
	}

	private connect() {
		debug("connecting...")
		this.ws = new WebSocket(`ws://${this.args.config.host}`)

		this.ws.onopen = () => {
			debug("connected!")
			this.reconnectAttempt = 1
			this.args.onStart()
		}

		this.ws.onmessage = (event) => {
			const message = JSON.parse(event.data) as ServerPubsubMessage
			debug("<", message.type, message.key, message.value)
			this.args.onChange(message.key, message.value)
		}

		this.ws.onerror = (error) => {
			debug("error", error)
		}
		this.ws.onclose = () => {
			debug("closed")
			this.attemptReconnect()
		}
	}

	private async attemptReconnect() {
		if (!navigator.onLine) return

		await sleep(2 ** this.reconnectAttempt * SecondMs)
		this.reconnectAttempt += 1
		this.connect()
	}

	private send(message: ClientPubsubMessage) {
		if (this.ws.readyState === WebSocket.OPEN) {
			debug(">", message.type, message.key)
			this.ws.send(JSON.stringify(message))
		}
	}

	subscribe(key: string) {
		this.send({ type: "subscribe", key })
	}

	unsubscribe(key: string) {
		this.send({ type: "unsubscribe", key })
	}
}
