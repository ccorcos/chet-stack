import { setRecordMap } from "../../shared/recordMapHelpers"
import { RecordMap, RecordPointer } from "../../shared/schema"
import { ClientEnvironment } from "../services/ClientEnvironment"
import { Loader } from "../services/LoaderCache"
import { RecordCache } from "../services/RecordCache"
import { RecordStorage } from "../services/RecordStorage"
import { ClientApi } from "../services/api"

export function loadRecord(environment: ClientEnvironment, pointer: RecordPointer): Loader<void> {
	const { loaderCache, recordCache, recordStorage, api } = environment

	const existingLoader = loaderCache.get(`record/${pointer.table}/${pointer.id}`)
	if (existingLoader) return existingLoader

	const loader = new Loader<void>()
	loaderCache.set(`record/${pointer.table}/${pointer.id}`, loader)

	// If we already have the record in memory, then we don't need to load it.
	const value = recordCache.getRecord(pointer)
	if (value) {
		loader.resolve()
		return loader
	}

	// If this contains a newer record (from offline edits) or an older record,
	// the highest version will remain in the cache.
	const cached = recordStorage.getRecord(pointer).then((record) => {
		if (!record) return
		const recordMap: RecordMap = {}
		setRecordMap(recordMap, pointer, record)
		recordCache.writeRecordMap(recordMap)
		loader.resolve()
		return record
	})

	api.getRecords({ pointers: [pointer] }).then((response) => {
		if (response.status === 200) {
			const { recordMap } = response.body
			recordCache.writeRecordMap(recordMap)
			recordStorage.writeRecordMap(recordMap)
			return loader.resolve()
		}

		// If we're offline, then we want to wait to see if its cached.
		if (response.status === 0) {
			return cached
				.then((record) => {
					if (!record) loader.reject(new Error("Offline cache miss."))
				})
				.catch(loader.reject)
		}

		return loader.reject(new Error("Network error: " + response.status))
	})

	return loader
}

export function unloadRecord(environment: ClientEnvironment, pointer: RecordPointer) {
	const { loaderCache, recordCache } = environment
	recordCache.purgeRecords([pointer])
	loaderCache.delete(`record/${pointer.table}/${pointer.id}`)
}

export function syncRecord(
	environment: { recordCache: RecordCache; recordStorage: RecordStorage; api: ClientApi },
	pointer: RecordPointer,
	version: number
) {
	const { api, recordCache, recordStorage } = environment

	const record = recordCache.getRecord(pointer)
	if (!record) return console.warn("Recieved update for record that hasn't been loaded.")

	if (record.version < version) {
		api.getRecords({ pointers: [pointer] }).then((response) => {
			if (response.status === 200) {
				const { recordMap } = response.body
				recordCache.writeRecordMap(recordMap)
				recordStorage.writeRecordMap(recordMap)
			}
		})
	}
}
