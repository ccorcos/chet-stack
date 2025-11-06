import React, { useState } from "react"
import { ListBox, ListItem, useListBox } from "../ListBox"

export function ListBoxDemo() {
	return (
		<div style={{ display: "flex", gap: 24 }}>
			<MiniListbox />
			<MiniListbox />
		</div>
	)
}

function MiniListbox() {
	const items = ["apple", "orange", "lemon", "grapefruit", "cherry", "plum"]

	const [selected, setSelected] = useState<string[]>([])
	const { onClick, onKeyDown } = useListBox({
		list: items,
		selected,
		setSelected,
		multiselect: true,
	})

	return (
		<ListBox onClick={onClick} onKeyDown={onKeyDown}>
			{items.map((item) => (
				<ListItem key={item} item={item} selected={selected.includes(item)}>
					{item}
				</ListItem>
			))}
		</ListBox>
	)
}
