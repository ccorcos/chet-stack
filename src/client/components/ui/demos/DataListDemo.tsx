import React from "react"
import { useGet, useWrite } from "../../../hooks/useDatabase"
import { useDraggableList } from "../../../hooks/useDraggableList"
import { Button } from "../Button"

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

function JSONArrayDemo() {
	const result = useGet("JSONArrayDemo")
	result.remoteResult.suspend()
	const data = JSON.parse(result.localResult.hit || "[]")

	const write = useWrite()
	const add = () => {
		if (data.length === 0) {
			write({ set: [{ key: "JSONArrayDemo", value: JSON.stringify([0]) }] })
		} else {
			const last = data[data.length - 1]
			write({ set: [{ key: "JSONArrayDemo", value: JSON.stringify([...data, last + 1]) }] })
		}
	}

	const { onMouseDown, dragState } = useDraggableList({
		direction: "vertical",
		onDragEnd: ({ fromIndex, toIndex }) => {
			const newData = data.slice()
			newData.splice(toIndex, 0, newData.splice(fromIndex, 1)[0])
			write({ set: [{ key: "JSONArrayDemo", value: JSON.stringify(newData) }] })
		},
	})

	// select and delete

	return (
		<div>
			<div>JSONArray</div>
			<div style={{ userSelect: "none" }} onMouseDown={onMouseDown}>
				{data.map((item, index) => (
					<div
						key={index}
						data-drag-index={index}
						style={{
							width: 100,
							cursor: dragState.dragging ? "grabbing" : "grab",
							boxShadow:
								dragState.dragging && dragState.fromIndex === index ? "var(--shadow)" : "none",
						}}
					>
						{item}
					</div>
				))}
				<Button onClick={add}>Add</Button>
			</div>
		</div>
	)
}

function FractionalIndexingDemo() {
	return <div>FractionalIndexing</div>
}

function LinkedListDemo() {
	return <div>LinkedList</div>
}
