import React from "react"
import ReactDOM from "react-dom"
import { UserRecord } from "../shared/schema"
import { createClientApi } from "./api"
import { App } from "./App"
import { ClientEnvironment, ClientEnvironmentProvider } from "./ClientEnvironment"
import { RecordCache } from "./RecordCache"
import { RecordLoader } from "./RecordLoader"
import { TransactionQueue } from "./TransactionQueue"

type AppState = { type: "logged-out" } | { type: "logged-in"; user: UserRecord }

// TODO: router.
// - login, just give a name? should we use cookies though?
// - list threads, create a new thread, write messages.
// - notifications for others.
// - realtime updates.
// - offline tolerance
// 	 - transaction queue, offline cache
//   - service worker for caching the assets.

const cache = new RecordCache()
const api = createClientApi({ cache })
const loader = new RecordLoader({ api })
const transactionQueue = new TransactionQueue({ cache, api })

const environment: ClientEnvironment = { cache, api, loader, transactionQueue }

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
