import React, { useState } from "react"
import { useKeyboardArrowFocus } from "../../../client/hooks/useKeyboardArrowFocus"
import { useMergeCallbacks } from "../../../client/hooks/useMergeCallbacks"
import { useSelectableList } from "../../../client/hooks/useSelectableList"

const initialList = [...Array(12)].map((_, i) => `Item ${i + 1} `)

export function SelectableListDemo() {
	const [list, setList] = useState(initialList)
	const [selected, setSelected] = useState<string[]>([])
	const { onClick, onKeyDown: onKeyDown2 } = useSelectableList({
		list,
		selected,
		setSelected,
		multiselect: true,
	})

	const { onKeyDown: onKeyDown1 } = useKeyboardArrowFocus()
	const onKeyDown = useMergeCallbacks(onKeyDown1, onKeyDown2)

	return (
		<div tabIndex={0} onClick={onClick} onKeyDown={onKeyDown}>
			{list.map((item) => (
				<div
					key={item}
					data-selectable
					ref={(node: any) => {
						if (node) node._selectable = item
					}}
					tabIndex={-1}
					style={{
						width: 100,
						userSelect: "none",
						padding: 8,
						cursor: "pointer",
						color: selected.includes(item) ? "var(--white0)" : "",
						background: selected.includes(item) ? "var(--accent0)" : "",
					}}
				>
					{item}
				</div>
			))}
		</div>
	)
}
