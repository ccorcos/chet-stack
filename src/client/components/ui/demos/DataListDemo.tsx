import React, { useState } from "react"
import { useGet, useWrite } from "../../../hooks/useDatabase"
import { useDraggableList } from "../../../hooks/useDraggableList"
import { isShortcut } from "../../../hooks/useShortcut"
import { Button } from "../Button"
import { ListBox, ListItem, useListBox } from "../ListBox"

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

	const data: string[] = JSON.parse(result.localResult.hit || "[]")

	const write = useWrite()

	const addItem = () => {
		if (data.length === 0) {
			write({ set: [{ key: JSONArrayDemoKey, value: JSON.stringify([0]) }] })
		} else {
			const last = Math.max(...data.map((i) => parseInt(i))) || 0
			write({
				set: [{ key: JSONArrayDemoKey, value: JSON.stringify([...data, (last + 1).toString()]) }],
			})
		}
	}

	const { onMouseDown, dragState } = useDraggableList({
		direction: "vertical",
		onDragEnd: ({ fromIndex, toIndex }) => {
			const newData = data.slice()
			newData.splice(toIndex, 0, newData.splice(fromIndex, 1)[0])
			write({ set: [{ key: JSONArrayDemoKey, value: JSON.stringify(newData) }] })
		},
	})

	const [selected, setSelected] = useState(new Set<string>())
	const { onClick, onKeyDown } = useListBox({
		list: data,
		selected: selected,
		setSelected: setSelected,
		multiselect: true,
	})

	const deleteSelection = () => {
		write({
			set: [
				{
					key: JSONArrayDemoKey,
					value: JSON.stringify(data.filter((item) => !selected.has(item))),
				},
			],
		})
	}

	return (
		<div>
			<div>JSONArray</div>
			<ListBox
				style={{ userSelect: "none" }}
				onMouseDown={onMouseDown}
				onClick={onClick}
				onKeyDown={onKeyDown}
			>
				{data.map((item, index) => (
					<ListItem
						key={item}
						item={item}
						data-drag-index={index}
						style={{
							width: 100,
							cursor: dragState.dragging ? "grabbing" : "grab",
							boxShadow:
								dragState.dragging && dragState.fromIndex === index ? "var(--shadow)" : "none",
						}}
						selected={selected.has(item)}
						onKeyDown={(e) => {
							if (isShortcut("delete", e.nativeEvent)) {
								e.preventDefault()
								deleteSelection()
							}
						}}
					>
						{item}
					</ListItem>
				))}
			</ListBox>
			<Button onClick={addItem}>Add</Button>
		</div>
	)
}

function FractionalIndexingDemo() {
	return <div>FractionalIndexing</div>
}

function LinkedListDemo() {
	return <div>LinkedList</div>
}
