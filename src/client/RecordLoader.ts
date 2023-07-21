import { deleteRecordMap, getRecordMap, setRecordMap } from "../shared/recordMapHelpers"
import { RecordPointer, RecordTable } from "../shared/schema"

class Loader<T> extends Promise<T> {
	public loaded = false
	public error = false

	constructor(fn: (resolve: (value: T) => void, reject: (error: any) => void) => void) {
		super((resolve, reject) => {
			fn(
				(value) => {
					this.loaded = true
					resolve(value)
				},
				(error) => {
					this.error = true
					reject(error)
				}
			)
		})
	}

	static wrap = function <T>(promise: Promise<T>) {
		return new Loader<T>((resolve, reject) => promise.then(resolve).catch(reject))
	}
}

export type RecordLoaderApi = {
	loadRecord<T extends RecordTable>(pointer: RecordPointer<T>): Loader<void>
}

export class RecordLoader {
	constructor(private args: { onFetchRecord: (pointer: RecordPointer) => Promise<void> }) {}

	private loaderMap: { [table: string]: { [id: string]: Loader<void> } } = {}

	unloadRecord(pointer: RecordPointer) {
		deleteRecordMap(this.loaderMap, pointer)
	}

	loadRecord<T extends RecordTable>(pointer: RecordPointer<T>) {
		const loader = getRecordMap(this.loaderMap, pointer)
		if (loader) return loader
		// if (loader && !loader.error) return loader

		// @ts-ignore
		const newLoader = Loader.wrap(this.args.onFetchRecord(pointer))
		setRecordMap(this.loaderMap, pointer, newLoader)
		return newLoader
	}
}

export class GetMessagesLoader {
	constructor(
		private args: { onGetMessages: (threadId: string, limit: number) => Promise<void> }
	) {}

	private loaderMap: {
		[threadId: string]: {
			limit: number
			loader: Loader<void>
		}
	} = {}

	getLimit(threadId: string) {
		const result = this.loaderMap[threadId]
		if (result) return result.limit
	}

	unloadThread(threadId: string) {
		delete this.loaderMap[threadId]
	}

	loadThread(threadId: string, limit: number) {
		const result = this.loaderMap[threadId]

		if (result && result.limit >= limit) {
			return result.loader
			// if (loader && !loader.error) return loader
		}

		const loader = Loader.wrap(this.args.onGetMessages(threadId, limit))
		this.loaderMap[threadId] = { limit, loader }
		return loader
	}
}
