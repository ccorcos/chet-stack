import React from "react"
import { useDraggableList } from "../../hooks/useDraggableList"
import { isShortcut } from "../../hooks/useShortcut"
import { Button } from "./Button"
import { ListBox, ListItem, useListBox } from "./ListBox"

/** Selectable and Draggable */

export function DataList(props: {
	selected: Set<string>
	setSelected: React.Dispatch<React.SetStateAction<Set<string>>>
	list: string[]
	onInsert: () => void
	onDelete: (items: Set<string>) => void
	/**
	 * const newData = data.slice()
	 * newData.splice(toIndex, 0, newData.splice(fromIndex, 1)[0])
	 */
	onReorder: (args: { fromIndex: number; toIndex: number }) => void
}) {
	const { selected, setSelected } = props

	const { onClick, onKeyDown } = useListBox({
		list: props.list,
		selected: selected,
		setSelected: setSelected,
		multiselect: true,
	})

	const { onMouseDown, dragState } = useDraggableList({
		direction: "vertical",
		onDragEnd: ({ fromIndex, toIndex }) => {
			// setSelected(new Set([props.list[fromIndex]]))
			props.onReorder({ fromIndex, toIndex })
		},
	})

	return (
		<>
			<ListBox
				style={{ userSelect: "none" }}
				onMouseDown={onMouseDown}
				onClick={onClick}
				onKeyDown={onKeyDown}
			>
				{props.list.map((item, index) => (
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
								props.onDelete(selected)
							}
						}}
					>
						{item}
					</ListItem>
				))}
			</ListBox>
			<Button onClick={props.onInsert}>Add</Button>
		</>
	)
}
