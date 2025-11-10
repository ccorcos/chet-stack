import { useDraggableList } from "client/hooks/useDraggableList"
import React, { useState } from "react"
import { toast } from "../helpers/toast"

const initialList = [...Array(12)].map((_, i) => `Item ${i + 1} ` + "-".repeat(i))

export function DraggableListDemo() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			<div>DraggableListDemo</div>
			<DraggableList direction="vertical" />
			<DraggableList direction="horizontal" />
			{/* Wrapped list doesn't work yet. */}
			{/* <div style={{ width: 400 }}>
				<DraggableList direction="horizontal" />
			</div> */}
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
					flexWrap: "wrap",
					flexDirection: props.direction === "horizontal" ? "row" : "column",
					gap: 8,
				}}
			>
				{list.map((item, index) => (
					<div
						key={index}
						data-drag-index={index}
						style={{
							width: props.direction === "horizontal" ? "auto" : 100,
							userSelect: "none",
							cursor: dragState.dragging ? "grabbing" : "grab",
							backgroundColor: "var(--bg0)",
							boxShadow:
								dragState.dragging && dragState.fromIndex === index ? "var(--shadow)" : "none",
						}}
						onClick={() => {
							toast("Clicked " + item)
						}}
					>
						{item}
					</div>
				))}
			</div>
		</>
	)
}
