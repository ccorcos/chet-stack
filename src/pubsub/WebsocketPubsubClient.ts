import { ClientMessage, ServerMessage } from "pubsub/types"
import { SecondMs } from "shared/dateHelpers"
import { sleep } from "shared/sleep"

const debug = (...args: any[]) => console.log("pubsub:", ...args)

// type WebsocketState =
// 	| {
// 			state: "online"
// 	  }
// 	| {
// 			state: "offline"
// 			connecting: boolean
// 	  }

export class WebsocketPubsubClient {
	private ws: WebSocket
	private reconnectAttempt = 1

	constructor(
		private args: {
			onChange: (key: string, value: any) => void
			onOpen?: () => void
			onClose?: () => void
		}
	) {}

	// state = new Store<WebsocketState>({ state: "offline", connecting: false })

	start() {
		this.connect()
		this.reconnectAttempt = 1

		window.addEventListener("online", () => {
			this.reconnectAttempt = 1
			this.connect()
		})
	}

	private connect() {
		debug("connecting...")
		this.ws = new WebSocket(`ws://${location.host}`)
		// this.state.setState({ state: "offline", connecting: true })

		this.ws.onopen = () => {
			debug("connected!")
			this.reconnectAttempt = 1
			// this.state.setState({ state: "online" })
		}

		this.ws.onmessage = (event) => {
			const message = JSON.parse(event.data) as ServerMessage
			debug("<", message.type, message.key, message.value)
			this.args.onChange(message.key, message.value)
		}

		this.ws.onerror = (error) => {
			debug("error", error)
		}
		this.ws.onclose = () => {
			debug("closed")
			// this.state.setState({ state: "offline", connecting: true })
			this.attemptReconnect()
		}
	}

	private async attemptReconnect() {
		if (!navigator.onLine) return
		const waitForMs = Math.min(30 * SecondMs, 2 ** this.reconnectAttempt * SecondMs)
		await sleep(waitForMs)
		this.reconnectAttempt += 1
		this.connect()
	}

	private send(message: ClientMessage) {
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

	publish(key: string, value: any) {
		this.send({ type: "publish", key, value })
	}
}
