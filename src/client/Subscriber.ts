const Primus = require("./primuslib")

import type { Socket } from "primus"
import { ClientPubsubMessage, ServerPubsubMessage } from "../shared/PubSubTypes"
import { RecordPointer } from "../shared/schema"
import { ClientConfig } from "./ClientConfig"

export class Subscriber {
	primus: Socket
	constructor(environment: { config: ClientConfig }) {
		this.primus = new Primus(environment.config.url)
	}

	onChange(fn: (pointer: RecordPointer, version: number) => void) {
		this.primus.on("data", (message: ServerPubsubMessage) => {
			console.log("message", message)
			const [table, id] = message.key.split(":")
			const version = message.value
			const pointer = { table, id } as RecordPointer
			fn(pointer, version)
		})
	}

	subscribe(pointer: RecordPointer) {
		const message: ClientPubsubMessage = {
			type: "subscribe",
			key: [pointer.table, pointer.id].join(":"),
		}
		this.primus.write(message)
	}
	unsubscribe(pointer: RecordPointer) {
		const message: ClientPubsubMessage = {
			type: "unsubscribe",
			key: [pointer.table, pointer.id].join(":"),
		}
		this.primus.write(message)
	}
}
