import React, { useState } from "react"
import { ListBox, ListItem } from "../ListBox"

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
	const [selectedIndex, setSelectedIndex] = useState<number | undefined>()

	return (
		<ListBox
			items={items}
			selectedIndex={selectedIndex}
			onSelectIndex={setSelectedIndex}
			autoFocus={true}
		>
			{(item, props) => <ListItem {...props}>{item}</ListItem>}
		</ListBox>
	)
}
