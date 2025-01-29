import React, { useState } from "react"
import { useGet, useWrite } from "../../../hooks/useDatabase"
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

	const write = useWrite()
	const events = useDraggableList()

	if (result.localResult.miss) return <div>Loading...</div>
	const data = JSON.parse(result.localResult.hit || "[]")

	const add = () => {
		if (data.length === 0) {
			write({ set: [{ key: "JSONArrayDemo", value: JSON.stringify([0]) }] })
		} else {
			const last = data[data.length - 1]
			write({ set: [{ key: "JSONArrayDemo", value: JSON.stringify([...data, last + 1]) }] })
		}
	}

	// select and delete
	// drag to reorder

	return (
		<div>
			<div>JSONArray</div>
			<div {...events} style={{ userSelect: "none" }}>
				{data.map((item, index) => (
					<div key={index} className="draggable-handle draggable-item">
						{item}
					</div>
				))}
				<Button onClick={add}>Add</Button>
			</div>
		</div>
	)
}

type DragState =
	| {
			dragging: false
	  }
	| {
			dragging: true
			offset: { x: number; y: number }
			item: HTMLElement
	  }

function useDraggableList() {
	// .draggable-handle
	// .draggable-item

	const [dragState, setDragState] = useState<DragState>({ dragging: false })

	const onMouseDown = (event: React.MouseEvent) => {
		const elm = event.target as HTMLElement
		const handle = elm.closest(".draggable-handle")
		if (!handle) return

		const item = handle.closest(".draggable-item") as HTMLElement | null
		if (!item) return

		setDragState({
			dragging: true,
			offset: {
				x: event.clientX,
				y: event.clientY,
			},
			item,
		})
	}

	const onMouseMove = (event: React.MouseEvent) => {
		if (!dragState.dragging) return

		const item = dragState.item
		const x = 0 // event.clientX - dragState.offset.x
		const y = event.clientY - dragState.offset.y
		item.style.transform = `translate(${x}px, ${y}px)`
	}

	const onMouseUp = (event: React.MouseEvent) => {
		if (!dragState.dragging) return

		const item = dragState.item
		item.style.transform = ""
		setDragState({ dragging: false })
	}

	return { onMouseDown, onMouseUp, onMouseMove }
}

function FractionalIndexingDemo() {
	return <div>FractionalIndexing</div>
}

function LinkedListDemo() {
	return <div>LinkedList</div>
}
