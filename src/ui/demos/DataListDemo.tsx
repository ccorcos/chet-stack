import { Subspace } from "client/components/Subspace"
import { useGet, useWrite } from "client/hooks/useDatabase"
import React, { useState } from "react"
import { DataList } from "../components/DataList"

// 1. Fractional indexing
// 2. Linked list
// 3. JSON array in a single object

export function DataListDemo() {
	return (
		<Subspace prefix={["hello"]}>
			<div>
				<div>DataListDemo</div>
				<JSONArrayDemo />
			</div>
		</Subspace>
	)
}

const JSONArrayDemoKey = ["DataListDemo-JSONArray"]

function JSONArrayDemo() {
	const result = useGet(JSONArrayDemoKey)
	result.remoteResult.suspend()
	const list: string[] = result.localResult.hit || []

	const onNewItem = () => {
		if (list.length === 0) return "0"
		const last = Math.max(...list.map((i) => parseInt(i))) || 0
		const newItem = (last + 1).toString()
		return newItem
	}

	const write = useWrite()

	const onInsert = () => {
		if (list.length === 0) {
			write({ set: [{ key: JSONArrayDemoKey, value: [onNewItem()] }] })
		} else {
			write({
				set: [{ key: JSONArrayDemoKey, value: [...list, onNewItem()] }],
			})
		}
	}

	const onReorder = ({ fromIndex, toIndex }: { fromIndex: number; toIndex: number }) => {
		const newList = list.slice()
		newList.splice(toIndex, 0, newList.splice(fromIndex, 1)[0])
		write({ set: [{ key: JSONArrayDemoKey, value: newList }] })
	}

	const onDelete = (items: string[]) => {
		write({
			set: [
				{
					key: JSONArrayDemoKey,
					value: list.filter((item) => !items.includes(item)),
				},
			],
		})
	}

	const [selected, setSelected] = useState<string[]>([])
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
			>
				{(item) => <div>Hello {item}</div>}
			</DataList>
		</div>
	)
}

function FractionalIndexingDemo() {
	return <div>FractionalIndexing</div>
}

function LinkedListDemo() {
	return <div>LinkedList</div>
}
