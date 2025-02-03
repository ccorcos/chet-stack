import React, { useCallback, useRef, useState } from "react"
import { useRefCurrent } from "../../../hooks/useRefCurrent"

const initialList = [...Array(12)].map((_, i) => `Item ${i + 1} `)

export function SelectableListDemo() {
	const [list, setList] = useState(initialList)
	const { selected, onClick } = useSelectableList(list)

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

function useSelectableList(list: string[]) {
	// Assumes data-key="element" on each element.
	const [selected, setSelected] = useState(new Set<string>())
	const selectedRef = useRefCurrent(selected)

	const prevClickRef = useRef<string | undefined>()

	const onClick = useCallback((event: React.MouseEvent) => {
		const selected = selectedRef.current
		const element = (event.target as HTMLElement).closest("[data-key]")
		if (!element) return
		const key = element.getAttribute("data-key")!

		if (event.shiftKey) {
			const index = list.indexOf(key)
			if (index === -1) throw new Error("Clicked item not found.")

			const prevIndex =
				prevClickRef.current === undefined ? index : list.indexOf(prevClickRef.current)
			if (index === -1) throw new Error("Prev clicked item not found.")

			const [start, end] = [index, prevIndex].sort((a, b) => a - b)

			const newSelected = new Set<string>(selected)
			for (let i = start; i <= end; i++) {
				newSelected.add(list[i])
			}
			setSelected(newSelected)
			prevClickRef.current = key
			return
		}
		if (event.metaKey || event.ctrlKey) {
			const newSelected = new Set<string>(selected)
			newSelected.add(key)
			setSelected(newSelected)
			prevClickRef.current = key
			return
		}

		setSelected(() => {
			const newSelected = new Set<string>()
			newSelected.add(key)
			return newSelected
		})
		prevClickRef.current = key
	}, [])

	return { selected, onClick }
}
