/*

A local cache of records along with listeners for changes to those records.

*/

import { RecordMap, RecordPointer } from "../shared/schema"

type RecordListener = () => void

export class RecordCache {
	recordMap: RecordMap

	listeners: { [table: string]: { [id: string]: Set<RecordListener> } } = {}
	addListener(pointer: RecordPointer, fn: RecordListener): () => void {
		const { table, id } = pointer

		const idMap = this.listeners[table] || {}
		const listenerSet = idMap[id] || new Set()

		listenerSet.add(fn)

		idMap[id] = listenerSet
		this.listeners[table] = idMap

		return () => {
			listenerSet.delete(fn)
			if (listenerSet.size === 0) delete idMap[id]
		}
	}
}
