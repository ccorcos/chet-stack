import { deleteRecordMap, getRecordMap, setRecordMap } from "./recordMapHelpers"
import { RecordPointer, RecordTable } from "./schema"

class Loader<T> extends Promise<T> {
	public loaded = false
	public error = false

	constructor(fn: (resolve: (value: T) => void, reject: (error: any) => void) => void) {
		super((resolve, reject) => {
			fn(
				(value) => {
					resolve(value)
					this.loaded = true
				},
				(error) => {
					reject(error)
					this.error = true
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

		const newLoader = Loader.wrap(this.args.onFetchRecord(pointer))
		setRecordMap(this.loaderMap, pointer, newLoader)
		return newLoader
	}
}
