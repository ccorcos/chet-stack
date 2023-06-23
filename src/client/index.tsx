import React from "react"
import ReactDOM from "react-dom"
import { DeferredPromise } from "../shared/DeferredPromise"
import { setRecordMap } from "../shared/recordMapHelpers"
import { RecordMap } from "../shared/schema"
import { createClientApi } from "./api"
import { App } from "./App"
import { ClientEnvironment, ClientEnvironmentProvider } from "./ClientEnvironment"
import { config } from "./config"
import { OfflineStorage } from "./OfflineStorage"
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
		storage.updateRecordMap(recordMap)
	},
})

const storage = new OfflineStorage()

const loader = new RecordLoader({
	async onFetchRecord(pointer) {
		// Not using Promise.race because we don't want to resolve early when offline
		// storage doesn't have the record.
		const deferred = new DeferredPromise<void>()

		// If this contains a newer record (from offline edits) or an older record,
		// the highest version will remain in the cache.
		storage.getRecord(pointer).then((record) => {
			if (!record) return
			const recordMap: RecordMap = {}
			setRecordMap(recordMap, pointer, record)
			cache.updateRecordMap(recordMap)
			deferred.resolve()
		})

		// This fetches the record and the response contains a recordMap
		// which gets merge into the RecordCache.
		api
			.getRecords({ pointers: [pointer] })
			.then((response) => {
				if (response.status !== 200) throw new Error("Could not fetch record update")
			})
			.then(deferred.resolve)
			.catch(deferred.reject)

		return deferred.promise
	},
})

const transactionQueue = new TransactionQueue({ cache, api, storage })

const environment: ClientEnvironment = {
	cache,
	api,
	loader,
	transactionQueue,
	config,
	subscriber,
	storage,
}

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

// Register service worker for offline caching.
window.addEventListener("load", function () {
	if ("serviceWorker" in navigator) {
		navigator.serviceWorker
			.register("/service-worker.js")
			.then(function (registration) {
				console.log("Service Worker registered with scope:", registration.scope)
			})
			.catch(function (err) {
				console.log("Service Worker registration failed:", err)
			})
	}
})
