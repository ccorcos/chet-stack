import React, { useState } from "react"
import { useDraggableList } from "../../../hooks/useDraggableList"

const initialList = [...Array(12)].map((_, i) => `Item ${i + 1}`)

export function DraggableListDemo() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			<div>DraggableListDemo</div>
			<DraggableList direction="vertical" />
			<DraggableList direction="horizontal" />
		</div>
	)
}

function DraggableList(props: { direction: "vertical" | "horizontal" }) {
	const [list, setList] = useState(initialList)

	const { onMouseDown, dragState } = useDraggableList({
		direction: props.direction,
		onDragEnd: ({ fromIndex, toIndex }) => {
			setList((list) => {
				const newList = list.slice()
				newList.splice(toIndex, 0, newList.splice(fromIndex, 1)[0])
				return newList
			})
		},
	})

	return (
		<>
			<div>{props.direction}</div>
			<div
				onMouseDown={onMouseDown}
				style={{
					display: "flex",
					flexDirection: props.direction === "horizontal" ? "row" : "column",
				}}
			>
				{list.map((item, index) => (
					<div
						key={index}
						data-drag-index={index}
						style={{
							width: 100,
							userSelect: "none",
							cursor: dragState.dragging ? "grabbing" : "grab",
							boxShadow:
								dragState.dragging && dragState.fromIndex === index ? "var(--shadow)" : "none",
						}}
					>
						{item}
					</div>
				))}
			</div>
		</>
	)
}
