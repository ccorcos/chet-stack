import React, { useState } from "react"
import { useDraggable } from "../hooks/useDraggable"

export function DraggableDemo() {
	const { onMouseDown, dragState } = useDraggable({
		onDragEnd: (p) => {
			setPosition(({ x, y }) => ({ x: x + p.x, y: y + p.y }))
		},
	})
	const [position, setPosition] = useState({ x: 0, y: 0 })

	return (
		<div>
			<div>DraggableDemo</div>
			<div
				style={{
					userSelect: "none",
					width: 100,
					height: 100,
					color: "white",
					background: "red",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					position: "relative",
					top: position.y,
					left: position.x,
					cursor: dragState.dragging ? "grabbing" : "grab",
				}}
				onMouseDown={onMouseDown}
			>
				{dragState.dragging ? "Dragging" : "Drag me!"}
			</div>
		</div>
	)
}
