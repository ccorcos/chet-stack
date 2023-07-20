import React from "react"
import ReactDOM from "react-dom"
import { DeferredPromise } from "../shared/DeferredPromise"
import { setRecordMap } from "../shared/recordMapHelpers"
import { RecordMap } from "../shared/schema"
import { App } from "./App"
import { ClientEnvironment, ClientEnvironmentProvider } from "./ClientEnvironment"
import { GetMessagesCache, RecordCache, keyToPointer, pointerToKey } from "./RecordCache"
import { GetMessagesLoader, RecordLoader } from "./RecordLoader"
import { RecordStorage } from "./RecordStorage"
import { TransactionQueue } from "./TransactionQueue"
import { WebsocketPubsubClient } from "./WebsocketPubsubClient"
import { createClientApi } from "./api"
import { config } from "./config"

const recordCache = new RecordCache({
	onSubscribe: (pointer) => {
		subscriber.subscribe(pointerToKey(pointer))
	},
	onUnsubscribe: (pointer) => {
		subscriber.unsubscribe(pointerToKey(pointer))
		recordLoader.unloadRecord(pointer)
	},
})

const recordStorage = new RecordStorage()

const recordLoader = new RecordLoader({
	async onFetchRecord(pointer) {
		// Not using Promise.race because we don't want to resolve early when offline
		// storage doesn't have the record.
		const deferred = new DeferredPromise<void>()

		// If this contains a newer record (from offline edits) or an older record,
		// the highest version will remain in the cache.
		const cached = recordStorage.getRecord(pointer).then((record) => {
			if (!record) return
			const recordMap: RecordMap = {}
			setRecordMap(recordMap, pointer, record)
			updateCaches(recordMap)
			deferred.resolve()
			return record
		})

		// This fetches the record and the response contains a recordMap
		// which gets merge into the RecordCache.
		api.getRecords({ pointers: [pointer] }).then((response) => {
			if (response.status === 200) return deferred.resolve()

			// If we're offline, then we want to wait to see if its cached.
			if (response.status === 0) {
				return cached
					.then((record) => {
						if (!record) deferred.reject(new Error("Offline cache miss."))
					})
					.catch(deferred.reject)
			}

			return deferred.reject(new Error("Network error: " + response.status))
		})

		return deferred.promise
	},
})

const getMessagesCache = new GetMessagesCache({
	environment: { recordCache },
	onSubscribe(threadId) {
		subscriber.subscribe(["getMessages", threadId].join(":"))
	},
	onUnsubscribe(threadId) {
		subscriber.unsubscribe(["getMessages", threadId].join(":"))
		getMessagesLoader.unloadThread(threadId)
	},
})

const getMessagesLoader = new GetMessagesLoader({
	onGetMessages: async (threadId) => {
		const deferred = new DeferredPromise<void>()

		// If this contains a newer record (from offline edits) or an older record,
		// the highest version will remain in the cache.
		// const cached = recordStorage.getRecord(pointer).then((record) => {
		// 	if (!record) return
		// 	const recordMap: RecordMap = {}
		// 	setRecordMap(recordMap, pointer, record)
		// 	recordCache.updateRecordMap(recordMap)
		// 	deferred.resolve()
		// 	return record
		// })

		// This fetches the record and the response contains a recordMap
		// which gets merge into the RecordCache.
		api.getMessages({ threadId }).then((response) => {
			if (response.status === 200) return deferred.resolve()

			// If we're offline, then we want to wait to see if its cached.
			// if (response.status === 0) {
			// 	return cached
			// 		.then((record) => {
			// 			if (!record) deferred.reject(new Error("Offline cache miss."))
			// 		})
			// 		.catch(deferred.reject)
			// }

			return deferred.reject(new Error("Network error: " + response.status))
		})

		return deferred.promise
	},
})

const subscriber = new WebsocketPubsubClient({
	config,
	onChange(key, value) {
		// TODO: this is a little messy
		if (key.startsWith("getMessages:")) {
			const [_, threadId] = key.split(":")
			api.getMessages({ threadId })
		} else {
			const pointer = keyToPointer(key)
			const version = value
			const record = recordCache.get(pointer)
			if (record && record.version < version) {
				api.getRecords({ pointers: [pointer] })
			}
		}
	},
})

function updateCaches(recordMap: RecordMap) {
	const writes = recordCache.updateRecordMap(recordMap)
	getMessagesCache.handleWrites(writes)
}

const api = createClientApi({
	onUpdateRecordMap(recordMap) {
		updateCaches(recordMap)
		recordStorage.updateRecordMap(recordMap)
	},
})

const transactionQueue = new TransactionQueue({
	environment: { recordCache, api },
	onUpdateRecordMap(recordMap) {
		updateCaches(recordMap)
		recordStorage.updateRecordMap(recordMap)
	},
})

const environment: ClientEnvironment = {
	recordCache,
	recordStorage,
	recordLoader,

	getMessagesCache,
	getMessagesLoader,

	api,
	transactionQueue,
	config,
	subscriber,
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
