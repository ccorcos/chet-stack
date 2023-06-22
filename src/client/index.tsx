import React from "react"
import ReactDOM from "react-dom"
import { createClientApi } from "./api"
import { App } from "./App"
import { ClientEnvironment, ClientEnvironmentProvider } from "./ClientEnvironment"
import { config } from "./config"
import { RecordCache } from "./RecordCache"
import { RecordLoader } from "./RecordLoader"
import { TransactionQueue } from "./TransactionQueue"
import { WebsocketPubsubClient } from "./WebsocketPubsubClient"

const subscriber = new WebsocketPubsubClient({
	config,
	onChange(pointer, version) {
		const value = cache.getRecord(pointer)
		if (value && value.version < version) {
			api.getRecords({ pointers: [pointer] })
		}
	},
})

const cache = new RecordCache({
	onSubscribe: (pointer) => {
		subscriber.subscribe(pointer)
		console.log("Subscribe", pointer)
	},
	onUnsubscribe: (pointer) => {
		console.log("Unsubscribe", pointer)
		subscriber.unsubscribe(pointer)
		loader.unloadRecord(pointer)
	},
})

const api = createClientApi({
	onUpdateRecordMap(recordMap) {
		cache.updateRecordMap(recordMap)
	},
})

const loader = new RecordLoader({
	async onFetchRecord(pointer) {
		// NOTE: this fetches the record and the response contains a recordMap which gets merged
		// into the RecordCache.
		const response = await api.getRecords({ pointers: [pointer] })
		if (response.status !== 200) throw new Error("Could not fetch record update")
	},
})

const transactionQueue = new TransactionQueue({ cache, api })

const environment: ClientEnvironment = { cache, api, loader, transactionQueue, config }

// Render the app.
const root = document.createElement("div")
document.body.appendChild(root)

ReactDOM.render(
	<ClientEnvironmentProvider value={environment}>
		<App />
	</ClientEnvironmentProvider>,
	root
)

// For debugging from the Console.
;(window as any)["environment"] = environment
Object.assign(window as any, environment)
