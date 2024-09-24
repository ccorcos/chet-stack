import { clamp } from "lodash"
import React, { useLayoutEffect, useRef, useState } from "react"
import { useDomEvent } from "../../../hooks/useDomEvent"

// TODO:
// - scroll to follow selection focus anchor
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
	const nColumns = 10000
	const nRows = 6000

	const rowHeight = 22
	const colWidth = 140
	const columnGap = 1
	const rowGap = 1
	const rowMargin = 5
	const colMargin = 2

	// ==========================================================================
	// Selection
	// ==========================================================================

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

	const setAndFocusSelection = (selection: TableSelection) => {
		setSelection(selection)
		scrollToSelection(selection)
	}

	const startSelection = (type: "cells" | "cols" | "rows", row: number, col: number) => {
		setAndFocusSelection({ type: type, start: { row, col }, end: { row, col } })
	}

	const expandSelectionTo = (selection: TableSelection, row: number, col: number) => {
		setAndFocusSelection({ ...selection, end: { row, col } })
	}

	const expandSelectionBy = (selection: TableSelection, rowOffset: number, colOffset: number) => {
		const { row, col } = selection.end

		if (selection.type === "rows") {
			setAndFocusSelection({
				...selection,
				end: { row: clamp(row + rowOffset, 0, nRows - 1), col: -1 },
			})
			return
		}
		if (selection.type === "cols") {
			setAndFocusSelection({
				...selection,
				end: { row: -1, col: clamp(col + colOffset, 0, nColumns - 1) },
			})
			return
		}
		if (selection.type === "cells") {
			setAndFocusSelection({
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

	// ==========================================================================
	// Virtual Rendering
	// ==========================================================================

	const containerRef = useRef<HTMLDivElement>(null)
	const [visibleRange, setVisibleRange] = useState({ top: 0, left: 0, right: 0, bottom: 0 })

	const gridHeight = (nRows + 1) * rowHeight + nRows * rowGap
	const gridWidth = (nColumns + 1) * colWidth + nColumns * columnGap

	const updateVisibleRange = () => {
		if (!containerRef.current) return

		const { scrollTop, scrollLeft, clientHeight, clientWidth } = containerRef.current
		const startRow = Math.floor(scrollTop / (rowHeight + rowGap))
		const endRow = Math.ceil((scrollTop + clientHeight) / (rowHeight + rowGap))
		const startCol = Math.floor(scrollLeft / (colWidth + columnGap))
		const endCol = Math.ceil((scrollLeft + clientWidth) / (colWidth + columnGap))

		setVisibleRange({
			top: clamp(startRow - rowMargin, 0, nRows - 1),
			left: clamp(startCol - colMargin, 0, nColumns - 1),
			bottom: clamp(endRow + rowMargin, 0, nRows - 1),
			right: clamp(endCol + colMargin, 0, nColumns - 1),
		})
	}

	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		updateVisibleRange()
	}

	useLayoutEffect(() => {
		updateVisibleRange()
	}, [])

	// ==========================================================================
	// Focus Selection
	// ==========================================================================

	const scrollToSelection = (selection: TableSelection) => {
		const { row, col } = selection.end

		if (!containerRef.current) return
		const { scrollTop, scrollLeft, clientHeight, clientWidth } = containerRef.current

		const scrollRect = {
			top: scrollTop,
			left: scrollLeft,
			bottom: scrollTop + clientHeight,
			right: scrollLeft + clientWidth,
		}

		const anchorRect = {
			top: (row + 1) * (rowHeight + rowGap),
			bottom: (row + 2) * (rowHeight + rowGap),
			left: (col + 1) * (colWidth + columnGap),
			right: (col + 2) * (colWidth + columnGap),
		}

		let scrollToTop: number | undefined
		let scrollToLeft: number | undefined

		console.log(scrollRect, anchorRect)

		if (anchorRect.bottom > scrollRect.bottom) {
			scrollToTop = anchorRect.bottom - clientHeight
		}

		const topHeaderRoom = rowHeight - rowGap
		if (anchorRect.top - topHeaderRoom < scrollRect.top) {
			scrollToTop = anchorRect.top - topHeaderRoom
		}

		if (anchorRect.right > scrollRect.right) {
			scrollToLeft = anchorRect.right - clientWidth
		}

		const leftHeaderRoom = colWidth - columnGap
		if (anchorRect.left - leftHeaderRoom < scrollRect.left) {
			scrollToLeft = anchorRect.left - leftHeaderRoom
		}

		if (scrollToTop !== undefined || scrollToLeft !== undefined) {
			containerRef.current.scrollTo({ top: scrollToTop, left: scrollToLeft })
		}
	}

	const nVisibleRows = visibleRange.bottom - visibleRange.top + 1
	const nVisibleCols = visibleRange.right - visibleRange.left + 1

	return (
		<div
			ref={containerRef}
			style={{ width: "100%", height: "100%", overflow: "auto", position: "relative" }}
			onKeyDown={handleKeyDown}
			onScroll={handleScroll}
			tabIndex={0}
		>
			<div style={{ height: gridHeight, width: gridWidth }}>
				{containerRef.current && (
					<div
						style={{
							display: "grid",
							gridTemplateColumns: `repeat(${nVisibleCols + 1}, ${colWidth}px)`,
							gridTemplateRows: `repeat(${nVisibleRows + 1}, ${rowHeight}px)`,

							userSelect: "none",
							border: "2px solid transparent", // space for focus outline

							// Positioning
							position: "absolute",
							top: visibleRange.top * (rowHeight + rowGap),
							left: visibleRange.left * (colWidth + columnGap),

							// Sizing
							// width: "fit-content",
							rowGap,
							columnGap,
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
								width: colWidth,
								height: rowHeight,
							}}
						></div>

						{/* Column headers */}
						{Array.from({ length: nVisibleCols }).map((_, i) => {
							const row = -1
							const col = visibleRange.left + i
							return (
								<div
									key={`header-${col}`}
									style={{
										width: colWidth,
										height: rowHeight,
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

						{/* Row headers and cells */}
						{Array.from({ length: nVisibleRows }).map((_, i) => {
							const row = visibleRange.top + i
							const col = -1

							return (
								<React.Fragment key={`row-${row}`}>
									{/* Row header */}
									<div
										data-type="header-row"
										style={{
											width: colWidth,
											height: rowHeight,
											backgroundColor: "var(--background2)",
											position: "sticky",
											left: 0,
											zIndex: 1,
											textAlign: "center",
											fontWeight: "bold",
											...cellStyle(row, col),
											// top: `${(row + 1) * rowHeight}px`,
										}}
										data-column-index={col}
										data-row-index={row}
										onClick={handleClickHeader}
										onDoubleClick={handleDoubleClickRowHeader}
									>
										Row {row + 1}
									</div>

									{/* Cells */}
									{Array.from({ length: nVisibleCols }).map((_, j) => {
										const col = visibleRange.left + j
										const index = row * nColumns + col
										return (
											<div
												key={index}
												style={{
													width: colWidth,
													height: rowHeight,
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
				)}
			</div>
		</div>
	)
}
