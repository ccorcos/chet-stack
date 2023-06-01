/*

A local cache of records along with listeners for changes to those records.

*/

import {
	deleteRecordMap,
	getRecordMap,
	setRecordMap,
} from "../shared/recordMapHelpers"
import { RecordMap, RecordPointer } from "../shared/schema"

type RecordListener = () => void

export class RecordCache {
	recordMap: RecordMap

	listeners: { [table: string]: { [id: string]: Set<RecordListener> } } = {}
	addListener(pointer: RecordPointer, fn: RecordListener): () => void {
		const listenerSet = getRecordMap(this.listeners, pointer) || new Set()
		listenerSet.add(fn)
		setRecordMap(this.listeners, pointer, listenerSet)

		return () => {
			listenerSet.delete(fn)
			if (listenerSet.size === 0) deleteRecordMap(this.listeners, pointer)
		}
	}
}
