import { setRecordMap } from "../../shared/recordMapHelpers"
import { RecordMap } from "../../shared/schema"
import { ClientEnvironment } from "../services/ClientEnvironment"
import { Loader, LoaderCache } from "../services/LoaderCache"
import { RecordCache } from "../services/RecordCache"
import { RecordStorage } from "../services/RecordStorage"
import { ClientApi } from "../services/api"

export function loadThreads(
	environment: ClientEnvironment,
	args: {
		userId: string
		limit: number
	}
): Loader<void> {
	const { loaderCache, recordCache, recordStorage, api } = environment
	const { userId, limit } = args

	const existingLoader = loaderCache.get(`threads/${userId}`)
	if (existingLoader && existingLoader.limit >= limit) return existingLoader

	const loader = new Loader<void>(limit)
	loaderCache.set(`threads/${userId}`, loader)

	const cached = recordStorage.getThreads({ limit: limit + 1 }).then((threads) => {
		const recordMap: RecordMap = {}
		for (const thread of threads) {
			setRecordMap(recordMap, { table: "thread", id: thread.id }, thread)
		}
		recordCache.writeRecordMap(recordMap)
		loader.resolve()
		return threads
	})

	api.getThreads({ limit: limit + 1 }).then((response) => {
		if (response.status === 200) {
			const { recordMap } = response.body
			recordCache.writeRecordMap(recordMap)
			recordStorage.writeRecordMap(recordMap)
			return loader.resolve()
		}

		// If we're offline, then we want to wait to see if its cached.
		if (response.status === 0) {
			return cached
				.then((threads) => {
					if (!threads) loader.reject(new Error("Offline cache miss."))
				})
				.catch(loader.reject)
		}

		return loader.reject(new Error("Network error: " + response.status))
	})

	return loader
}

export function unloadThreads(environment: ClientEnvironment, userId: string) {
	// TODO: its possible that we're leaving records behind in the record cache that were never subscribed to.
	// For example, if we loadMessages, but never call useRecord on a record that was returned, then it won't get purged.
	const { loaderCache } = environment
	loaderCache.delete(`threads/${userId}`)
}

export function syncThreads(
	environment: {
		loaderCache: LoaderCache
		api: ClientApi
		recordCache: RecordCache
		recordStorage: RecordStorage
	},
	userId: string
) {
	const { loaderCache, api, recordCache, recordStorage } = environment

	// Keep the existing limit.
	const loader = loaderCache.get(`threads/${userId}`)
	if (!loader) throw new Error("Recieved update for getThreads that hasn't been loaded.")

	const limit = loader.limit
	api.getThreads({ limit }).then((response) => {
		if (response.status === 200) {
			const { recordMap } = response.body
			recordCache.writeRecordMap(recordMap)
			recordStorage.writeRecordMap(recordMap)
		}
	})
}
