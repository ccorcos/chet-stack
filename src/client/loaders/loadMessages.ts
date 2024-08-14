import { setRecordMap } from "../../shared/recordMapHelpers"
import { RecordMap } from "../../shared/schema"
import { ClientEnvironment } from "../services/ClientEnvironment"
import { Loader, LoaderCache } from "../services/LoaderCache"
import { RecordCache } from "../services/RecordCache"
import { RecordStorage } from "../services/RecordStorage"
import { ClientApi } from "../services/api"

export function loadMessages(
	environment: ClientEnvironment,
	args: { threadId: string; limit: number }
): Loader<void> {
	const { loaderCache, recordCache, recordStorage, api } = environment

	const { threadId, limit } = args

	// TODO: this key is also used in the WebsocketPubsubClient callback
	const existingLoader = loaderCache.get(`messages/${threadId}`)
	if (existingLoader && existingLoader.limit >= limit) return existingLoader

	const loader = new Loader<void>(limit)
	loaderCache.set(`messages/${threadId}`, loader)

	// TODO: keep track in storage of whether we've fetched any messages yet so we don't
	// just return an empty array.

	const cached = recordStorage.getMessages({ threadId, limit: limit + 1 }).then((messages) => {
		const recordMap: RecordMap = {}
		for (const message of messages) {
			setRecordMap(recordMap, { table: "message", id: message.id }, message)
		}
		recordCache.writeRecordMap(recordMap)
		loader.resolve()
		return messages
	})

	api.getMessages({ threadId, limit: limit + 1 }).then((response) => {
		if (response.status === 200) {
			const { recordMap } = response.body
			recordCache.writeRecordMap(recordMap)
			recordStorage.writeRecordMap(recordMap)
			return loader.resolve()
		}

		// If we're offline, then we want to wait to see if its cached.
		if (response.status === 0) {
			return cached
				.then((messages) => {
					if (!messages) loader.reject(new Error("Offline cache miss."))
				})
				.catch(loader.reject)
		}

		return loader.reject(new Error("Network error: " + response.status))
	})

	return loader
}

export function unloadMessages(environment: ClientEnvironment, threadId: string) {
	// TODO: its possible that we're leaving records behind in the record cache that were never subscribed to.
	// For example, if we loadMessages, but never call useRecord on a record that was returned, then it won't get purged.
	const { loaderCache } = environment
	loaderCache.delete(`messages/${threadId}`)
}

export function syncMessages(
	environment: {
		loaderCache: LoaderCache
		api: ClientApi
		recordCache: RecordCache
		recordStorage: RecordStorage
	},
	threadId: string
) {
	const { loaderCache, api, recordCache, recordStorage } = environment

	// Keep the existing limit.
	const loader = loaderCache.get(`messages/${threadId}`)
	if (!loader) return console.warn("Recieved update for getMessages that hasn't been loaded.")

	const limit = loader.limit
	api.getMessages({ threadId, limit }).then((response) => {
		if (response.status === 200) {
			const { recordMap } = response.body
			recordCache.writeRecordMap(recordMap)
			recordStorage.writeRecordMap(recordMap)
		}
	})
}
