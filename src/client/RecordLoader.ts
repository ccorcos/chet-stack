import { getRecordMap, setRecordMap } from "../shared/recordMapHelpers"
import { RecordPointer, RecordTable } from "../shared/schema"
import { ClientApi } from "./api"

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
	constructor(private environment: { api: ClientApi }) {}

	loaderMap: { [table: string]: { [id: string]: Loader<void> } } = {}

	loadRecord<T extends RecordTable>(pointer: RecordPointer<T>) {
		const loader = getRecordMap(this.loaderMap, pointer)
		if (loader && !loader.error) return loader

		const newLoader = Loader.wrap(
			this.environment.api.getRecords({ pointers: [pointer] }).then((response) => {
				if (response.status !== 200) throw new Error("API error: " + response.status)
			})
		)
		setRecordMap(this.loaderMap, pointer, newLoader)
		return newLoader
	}
}
