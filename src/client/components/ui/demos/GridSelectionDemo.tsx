import React from "react"
import { useDomEvent } from "../../../hooks/useDomEvent"

// TODO:
// - shift click header selection
// - keyboard selection

type TableSelection =
	| {
			type: "cells"
			start: { row: number; col: number }
			end: { row: number; col: number }
	  }
	| { type: "cols"; start: number; end: number }
	| { type: "rows"; start: number; end: number }

export function GridSelectionDemo() {
	const nColumns = 40
	const nRows = 140

	const [isDragging, setIsDragging] = React.useState(false)
	const [selection, setSelection] = React.useState<TableSelection | undefined>()

	const getRowCol = (e: React.MouseEvent<HTMLDivElement>) => {
		const elm = e.target as HTMLElement
		const dataColumnIndex = elm.getAttribute("data-column-index") as string
		const dataRowIndex = elm.getAttribute("data-row-index") as string
		const col = parseInt(dataColumnIndex, 10)
		const row = parseInt(dataRowIndex, 10)
		return { row, col }
	}

	const startCellSelection = (row: number, col: number) => {
		setSelection({ type: "cells", start: { row, col }, end: { row, col } })
	}

	const expandSelection = (selection: TableSelection, row: number, col: number) => {
		switch (selection.type) {
			case "cells":
				setSelection({ ...selection, end: { row, col } })
				return
			case "cols":
				setSelection({ ...selection, end: col })
				return
			case "rows":
				setSelection({ ...selection, end: row })
				return
		}
	}

	const handleDoubleClickColumnHeader = (e: React.MouseEvent<HTMLDivElement>) => {
		const { col } = getRowCol(e)
		setSelection({ type: "cols", start: col, end: col })
	}

	const handleDoubleClickRowHeader = (e: React.MouseEvent<HTMLDivElement>) => {
		const { row } = getRowCol(e)
		setSelection({ type: "rows", start: row, end: row })
	}

	const handleClickHeader = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!selection) return
		if (!e.shiftKey) return
		if (selection.type === "cells") return
		const { row, col } = getRowCol(e)
		expandSelection(selection, row, col)
	}

	const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		const { row, col } = getRowCol(e)
		setIsDragging(true)
		if (!e.shiftKey || !selection) startCellSelection(row, col)
		else expandSelection(selection, row, col)
	}

	const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!isDragging || !selection) return
		const { row, col } = getRowCol(e)
		expandSelection(selection, row, col)
	}

	useDomEvent("mouseup", () => setIsDragging(false))

	const cellStyle = (row: number, col: number): React.CSSProperties => {
		if (!selection) return {}

		const selectedStyle = { backgroundColor: "var(--highlight2)" }
		const anchorStyle = {
			...selectedStyle,
			outline: "2px solid var(--highlight)",
			outlineOffset: -1,
		}

		if (selection.type === "cells") {
			if (row === selection.start.row && col === selection.start.col) {
				return anchorStyle
			}

			if (row < Math.min(selection.start.row, selection.end.row)) return {}
			if (row > Math.max(selection.start.row, selection.end.row)) return {}
			if (col < Math.min(selection.start.col, selection.end.col)) return {}
			if (col > Math.max(selection.start.col, selection.end.col)) return {}
			return selectedStyle
		}

		if (selection.type === "cols") {
			if (col === selection.start && row === -1) {
				return anchorStyle
			}
			if (col < Math.min(selection.start, selection.end)) return {}
			if (col > Math.max(selection.start, selection.end)) return {}
			return selectedStyle
		}

		if (selection.type === "rows") {
			if (row === selection.start && col === -1) {
				return anchorStyle
			}
			if (row < Math.min(selection.start, selection.end)) return {}
			if (row > Math.max(selection.start, selection.end)) return {}
			return selectedStyle
		}
		return {}
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {}

	return (
		<div style={{ width: "100%", height: "100%", overflow: "auto" }} onKeyDown={handleKeyDown}>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: `auto repeat(${nColumns}, 1fr)`,
					width: "fit-content",
					gap: 1,
					userSelect: "none",
				}}
			>
				{/* Empty top-left corner cell */}
				<div
					style={{
						position: "sticky",
						top: 0,
						left: 0,
						zIndex: 2,
						backgroundColor: "var(--background)",
					}}
				></div>

				{/* Column headers */}
				{Array.from({ length: nColumns }).map((_, i) => {
					const row = -1
					const col = i
					return (
						<div
							key={`header-${col}`}
							style={{
								height: 22,
								width: 120,
								backgroundColor: "var(--background2)",
								position: "sticky",
								top: 0,
								zIndex: 1,
								textAlign: "center",
								fontWeight: "bold",
								...cellStyle(row, col),
							}}
							data-column-index={col}
							data-row-index={row}
							onClick={handleClickHeader}
							onDoubleClick={handleDoubleClickColumnHeader}
						>
							Column {col + 1}
						</div>
					)
				})}

				{Array.from({ length: nRows }).map((_, i) => {
					const row = i
					const col = -1

					return (
						<React.Fragment key={`row-${row}`}>
							{/* Row header */}
							<div
								data-type="header-row"
								style={{
									height: 22,
									width: 80,
									backgroundColor: "var(--background2)",
									position: "sticky",
									left: 0,
									zIndex: 1,
									textAlign: "center",
									fontWeight: "bold",
									...cellStyle(row, col),
								}}
								data-column-index={col}
								data-row-index={row}
								onClick={handleClickHeader}
								onDoubleClick={handleDoubleClickRowHeader}
							>
								Row {row + 1}
							</div>

							{/* Cells */}
							{Array.from({ length: nColumns }).map((_, j) => {
								const col = j
								const index = row * nColumns + col
								return (
									<div
										key={index}
										style={{
											height: 22,
											width: 120,
											userSelect: isDragging ? "none" : undefined,
											...cellStyle(row, col),
										}}
										className="hover"
										data-row-index={row}
										data-column-index={col}
										onMouseDown={handleMouseDown}
										onMouseEnter={handleMouseEnter}
									>
										{index}
									</div>
								)
							})}
						</React.Fragment>
					)
				})}
			</div>
		</div>
	)
}
