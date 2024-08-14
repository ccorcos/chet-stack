import { isEqual, uniqWith } from "lodash"
import React from "react"
import ReactDOM from "react-dom"
// import ReactDOM from "react-dom/profiling"
import { fromSubscriptionKey } from "../shared/PubSubKeys"
import { RecordMap, RecordPointer } from "../shared/schema"
import { Container } from "./components/Container"
import { syncMessages, unloadMessages } from "./loaders/loadMessages"
import { syncRecord, unloadRecord } from "./loaders/loadRecord"
import { syncThreads } from "./loaders/loadThreads"
import { clientConfig } from "./services/ClientConfig"
import { ClientEnvironment } from "./services/ClientEnvironment"
import { LoaderCache } from "./services/LoaderCache"
import { RecordCache } from "./services/RecordCache"
import { RecordStorage } from "./services/RecordStorage"
import { Router } from "./services/Router"
import { SubscriptionCache } from "./services/SubscriptionCache"
import { TransactionQueue } from "./services/TransactionQueue"
import { UndoRedoStack } from "./services/UndoRedoStack"
import { WebsocketPubsubClient } from "./services/WebsocketPubsubClient"
import { createApi } from "./services/api"

const router = new Router()
const api = createApi()
const recordCache = new RecordCache()
const recordStorage = new RecordStorage()
const loaderCache = new LoaderCache()
const undoRedo = new UndoRedoStack()

const subscriptionCache = new SubscriptionCache({
	onSubscribe: (key) => {
		pubsub.subscribe(key)
	},
	onUnsubscribe: (key) => {
		pubsub.unsubscribe(key)

		const sub = fromSubscriptionKey(key)
		if (sub.type === "getRecord") unloadRecord(environment, sub.pointer)
		if (sub.type === "getMessages") unloadMessages(environment, sub.threadId)
		if (sub.type === "getThreads") unloadMessages(environment, sub.userId)
	},
})

const pubsub = new WebsocketPubsubClient({
	config: clientConfig,
	onStart() {
		const keys = subscriptionCache.keys()
		for (const key of keys) pubsub.subscribe(key)
	},
	onChange(key, value) {
		const sub = fromSubscriptionKey(key)

		if (sub.type === "getRecord") {
			const pointer = sub.pointer
			const version = value
			if (typeof version !== "number") throw new Error("Invalid record version.")
			syncRecord(environment, pointer, version)
		}

		if (sub.type === "getMessages") {
			const threadId = sub.threadId
			syncMessages(environment, threadId)
		}

		if (sub.type === "getThreads") {
			const userId = sub.userId
			syncThreads(environment, userId)
		}
	},
})

const transactionQueue = new TransactionQueue({
	environment: { api },
	async onRollback(transaction) {
		// Get all the pointers, fetch the latest and force update the cache.
		const pointers = uniqWith(
			transaction.operations.map(({ table, id }) => ({ table, id }) as RecordPointer),
			isEqual
		)

		const response = await api.getRecords({ pointers })
		if (response.status !== 200) throw new Error("Fix me.")

		// Force update the cache.
		const recordMap: RecordMap = response.body.recordMap
		recordCache.writeRecordMap(recordMap, true)
		recordStorage.writeRecordMap(recordMap, true)
	},
})

// Continue submitting transactions when coming back online.
window.addEventListener("online", () => transactionQueue.dequeue())

const environment: ClientEnvironment = {
	config: clientConfig,
	router,

	recordCache,
	recordStorage,
	subscriptionCache,
	loaderCache,

	api,
	pubsub,
	transactionQueue,
	undoRedo,
}

// Render the app.
const root = document.createElement("div")
document.body.appendChild(root)

ReactDOM.render(<Container environment={environment} />, root)

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
