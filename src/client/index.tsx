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

const subscriber = new WebsocketPubsubClient({ config }, (pointer, version) => {
	const value = cache.getRecord(pointer)
	if (value && value.version < version) {
		api.getRecords({ pointers: [pointer] })
	}
})

const cache = new RecordCache({ subscriber })
const api = createClientApi({ cache })

// TODO: the loader the the cache need to be consolidated somehow for garbafe collection.
const loader = new RecordLoader({ api })

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
