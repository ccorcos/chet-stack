import React, { useState } from "react"
import { useGet } from "../../../hooks/useDatabase"
import { useWriteJsonList } from "../../../hooks/useWriteJsonList"
import { DataList } from "../DataList"

// 1. Fractional indexing
// 2. Linked list
// 3. JSON array in a single object

export function DataListDemo() {
	return (
		<div>
			<div>DataListDemo</div>
			<JSONArrayDemo />
		</div>
	)
}

const JSONArrayDemoKey = "JSONArrayDemo2"

function JSONArrayDemo() {
	const result = useGet(JSONArrayDemoKey)
	result.remoteResult.suspend()
	const list: string[] = JSON.parse(result.localResult.hit || "[]")

	const { onInsert, onReorder, onDelete } = useWriteJsonList({
		key: JSONArrayDemoKey,
		value: list,
		onNewItem: () => {
			if (list.length === 0) return "0"
			const last = Math.max(...list.map((i) => parseInt(i))) || 0
			const newItem = (last + 1).toString()
			return newItem
		},
	})

	const [selected, setSelected] = useState(new Set<string>())
	return (
		<div style={{ width: 300 }}>
			<div>JSONArray</div>
			<DataList
				multiselect={true}
				list={list}
				selected={selected}
				setSelected={setSelected}
				onInsert={onInsert}
				onDelete={onDelete}
				onReorder={onReorder}
			/>
		</div>
	)
}

function FractionalIndexingDemo() {
	return <div>FractionalIndexing</div>
}

function LinkedListDemo() {
	return <div>LinkedList</div>
}
