import { DeferredPromise } from "../shared/DeferredPromise"
import { ClientPubsubMessage, ServerPubsubMessage } from "../shared/PubSubTypes"
import { RecordPointer } from "../shared/schema"
import { ClientConfig } from "./ClientConfig"

const debug = (...args: any[]) => console.log("WEBSOCKET:", ...args)

export class WebsocketPubsubClient {
	private ws: WebSocket
	private ready = new DeferredPromise<void>()

	constructor(args: {
		config: ClientConfig
		onChange: (pointer: RecordPointer, version: number) => void
	}) {
		this.ws = new WebSocket(`ws://${args.config.host}`)

		this.ws.onopen = () => this.ready.resolve()

		this.ws.onmessage = (event) => {
			debug(event.data)
			const message = JSON.parse(event.data) as ServerPubsubMessage
			// TODO: validate data

			const [table, id] = message.key.split(":")
			const version = message.value
			const pointer = { table, id } as RecordPointer
			args.onChange(pointer, version)
		}

		// TODO: reconnect, etc.
		// this.ws.onerror
		// this.ws.onclose
	}

	private async send(message: ClientPubsubMessage) {
		await this.ready.promise
		this.ws.send(JSON.stringify(message))
	}

	subscribe(pointer: RecordPointer) {
		this.send({
			type: "subscribe",
			key: [pointer.table, pointer.id].join(":"),
		})
	}

	unsubscribe(pointer: RecordPointer) {
		this.send({
			type: "unsubscribe",
			key: [pointer.table, pointer.id].join(":"),
		})
	}
}
