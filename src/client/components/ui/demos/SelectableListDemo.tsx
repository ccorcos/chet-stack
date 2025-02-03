import React, { useState } from "react"
import { useSelectableList } from "../../../hooks/useSelectableList"

const initialList = [...Array(12)].map((_, i) => `Item ${i + 1} `)

export function SelectableListDemo() {
	const [list, setList] = useState(initialList)
	const [selected, setSelected] = useState(new Set<string>())
	const { onClick } = useSelectableList({
		list,
		selected,
		setSelected,
		multiselect: true,
	})

	return (
		<div tabIndex={0} onClick={onClick}>
			{list.map((item) => (
				<div
					key={item}
					data-key={item}
					style={{
						width: 100,
						userSelect: "none",
						padding: 8,
						cursor: "pointer",
						color: selected.has(item) ? "var(--white)" : "",
						background: selected.has(item) ? "var(--blue)" : "",
					}}
				>
					{item}
				</div>
			))}
		</div>
	)
}
