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

	const { onInsert, onReorder, onDelete } = useWriteJsonList(JSONArrayDemoKey, list)

	const [selected, setSelected] = useState(new Set<string>())
	return (
		<div>
			<div>JSONArray</div>
			<DataList
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
