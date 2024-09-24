import { clamp } from "lodash"
import React from "react"
import { useDomEvent } from "../../../hooks/useDomEvent"

// TODO:
// - render performance
// - drag to re-order rows and columns
// - click cell to edit
// - click header to edit

type TableSelection =
	| {
			type: "cells"
			start: { row: number; col: number }
			end: { row: number; col: number }
	  }
	| { type: "cols"; start: { row: number; col: number }; end: { row: number; col: number } }
	| { type: "rows"; start: { row: number; col: number }; end: { row: number; col: number } }

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

	const startSelection = (type: "cells" | "cols" | "rows", row: number, col: number) => {
		setSelection({ type: type, start: { row, col }, end: { row, col } })
	}

	const expandSelectionTo = (selection: TableSelection, row: number, col: number) => {
		setSelection({ ...selection, end: { row, col } })
	}

	const expandSelectionBy = (selection: TableSelection, rowOffset: number, colOffset: number) => {
		const { row, col } = selection.end

		if (selection.type === "rows") {
			setSelection({ ...selection, end: { row: clamp(row + rowOffset, 0, nRows - 1), col: -1 } })
			return
		}
		if (selection.type === "cols") {
			setSelection({ ...selection, end: { row: -1, col: clamp(col + colOffset, 0, nColumns - 1) } })
			return
		}
		if (selection.type === "cells") {
			setSelection({
				...selection,
				end: {
					row: clamp(row + rowOffset, 0, nRows - 1),
					col: clamp(col + colOffset, 0, nColumns - 1),
				},
			})
			return
		}
	}

	const moveSelectionBy = (selection: TableSelection, rowOffset: number, colOffset: number) => {
		const { row, col } = selection.end

		if (selection.type === "rows") {
			if (selection.start.row === selection.end.row) {
				startSelection("rows", clamp(row + rowOffset, 0, nRows - 1), -1)
			} else {
				startSelection("rows", row, -1)
			}
			return
		}

		if (selection.type === "cols") {
			if (selection.start.col === selection.end.col) {
				startSelection("cols", -1, clamp(col + colOffset, 0, nColumns - 1))
			} else {
				startSelection("cols", -1, col)
			}
			return
		}

		if (selection.type === "cells") {
			if (selection.start.row === selection.end.row && selection.start.col === selection.end.col) {
				startSelection(
					"cells",
					clamp(row + rowOffset, 0, nRows - 1),
					clamp(col + colOffset, 0, nColumns - 1)
				)
			} else {
				startSelection("cells", row, col)
			}
			return
		}
	}

	const handleDoubleClickColumnHeader = (e: React.MouseEvent<HTMLDivElement>) => {
		const { row, col } = getRowCol(e)
		startSelection("cols", row, col)
	}

	const handleDoubleClickRowHeader = (e: React.MouseEvent<HTMLDivElement>) => {
		const { row, col } = getRowCol(e)
		startSelection("rows", row, col)
	}

	const handleClickHeader = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!selection) return
		if (!e.shiftKey) return
		if (selection.type === "cells") return
		const { row, col } = getRowCol(e)
		expandSelectionTo(selection, row, col)
	}

	const handleCellMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		const { row, col } = getRowCol(e)
		setIsDragging(true)
		if (!e.shiftKey || !selection) startSelection("cells", row, col)
		else expandSelectionTo(selection, row, col)
	}

	const handleCellMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!isDragging || !selection) return
		const { row, col } = getRowCol(e)
		expandSelectionTo(selection, row, col)
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

		if (row === selection.end.row && col === selection.end.col) {
			return anchorStyle
		}

		if (selection.type === "cells" || selection.type === "rows") {
			if (row < Math.min(selection.start.row, selection.end.row)) return {}
			if (row > Math.max(selection.start.row, selection.end.row)) return {}
		}
		if (selection.type === "cells" || selection.type === "cols") {
			if (col < Math.min(selection.start.col, selection.end.col)) return {}
			if (col > Math.max(selection.start.col, selection.end.col)) return {}
		}

		return selectedStyle
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (!selection) {
			if (e.key === "Enter") {
				e.preventDefault()
				startSelection("cells", 0, 0)
			}
			return
		}

		const offset = { row: 0, col: 0 }
		if (e.key === "ArrowDown") offset.row = 1
		if (e.key === "ArrowUp") offset.row = -1
		if (e.key === "ArrowRight") offset.col = 1
		if (e.key === "ArrowLeft") offset.col = -1
		if (offset.row !== 0 || offset.col !== 0) {
			e.preventDefault()

			const expand = e.shiftKey

			if (expand) {
				expandSelectionBy(selection, offset.row, offset.col)
			} else {
				moveSelectionBy(selection, offset.row, offset.col)
			}
		}

		if (e.key === "Escape") {
			e.preventDefault()
			setSelection(undefined)
		}
	}

	return (
		<div
			style={{ width: "100%", height: "100%", overflow: "auto" }}
			onKeyDown={handleKeyDown}
			tabIndex={0}
		>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: `auto repeat(${nColumns}, 1fr)`,
					width: "fit-content",
					gap: 1,
					userSelect: "none",
					border: "2px solid transparent", // space for focus outline
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
										onMouseDown={handleCellMouseDown}
										onMouseEnter={handleCellMouseEnter}
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
