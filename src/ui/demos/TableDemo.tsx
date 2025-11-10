import React from "react"
import { HeaderCell, Table } from "../components/Table"
import { useLocalStorageState } from "../hooks/useLocalStorageState"

export function TableDemo() {
	const [columnWidths, setColumnWidths] = useLocalStorageState(
		"TableDemo:columnWidths",
		[100, 200, 300]
	)

	const gap = 12
	const minWidth = 100

	const setWidth = (index: number) => (width: number) => {
		const newWidths = [...columnWidths]
		newWidths[index] = width
		setColumnWidths(newWidths)
	}

	return (
		<div style={{ height: "100%", display: "flex", padding: 12 }}>
			<Table gap={gap} columnWidths={columnWidths} setColumnWidths={setColumnWidths}>
				<HeaderCell
					width={columnWidths[0]}
					minWidth={minWidth}
					setWidth={setWidth(0)}
					style={{ border: "1px solid red", backgroundColor: "var(--bg0)" }}
				>
					Col 1
				</HeaderCell>
				<HeaderCell
					width={columnWidths[1]}
					minWidth={minWidth}
					setWidth={setWidth(1)}
					style={{ border: "1px solid blue", backgroundColor: "var(--bg0)" }}
				>
					Col 2
				</HeaderCell>
				<HeaderCell
					width={columnWidths[2]}
					minWidth={minWidth}
					setWidth={setWidth(2)}
					style={{ border: "1px solid green", backgroundColor: "var(--bg0)" }}
				>
					Col 3
				</HeaderCell>
				{Array.from({ length: 100 }).map((_, i) => (
					<React.Fragment key={i}>
						<div style={{ border: "1px solid red" }}>Row {i} Col 1</div>
						<div style={{ border: "1px solid blue" }}>Row {i} Col 2</div>
						<div style={{ border: "1px solid green" }}>Row {i} Col 3</div>
					</React.Fragment>
				))}
			</Table>
		</div>
	)
}
