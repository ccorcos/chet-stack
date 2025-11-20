import { SecondMs } from "shared/dateHelpers"
import { sleep } from "shared/sleep"

const debug = (...args: any[]) => console.log("websocket:", ...args)

export class WebsocketClient {
	private ws: WebSocket
	private reconnectAttempt = 1

	constructor(
		private args: {
			onMessage: (message: string) => void
			onOpen?: () => void
			onClose?: () => void
			onError?: (error: Event) => void
		}
	) {}

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

		this.ws.onopen = () => {
			debug("connected")
			this.reconnectAttempt = 1
			this.args.onOpen?.()
		}

		this.ws.onmessage = (event) => {
			this.args.onMessage(event.data)
		}

		this.ws.onerror = (error) => {
			debug("error", error)
			this.args.onError?.(error)
		}

		this.ws.onclose = () => {
			debug("closed")
			this.args.onClose?.()
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

	send(message: string) {
		this.ws.send(message)
	}
}
