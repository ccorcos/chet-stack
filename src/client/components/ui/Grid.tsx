import { clamp, debounce, defaults, isEqual, throttle } from "lodash"
import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { useDeepState } from "../../hooks/useDeepState"
import { useDomEvent } from "../../hooks/useDomEvent"
import { useRefCurrent } from "../../hooks/useRefCurrent"

type GridSelection =
	| {
			type: "cells"
			start: { row: number; col: number }
			end: { row: number; col: number }
	  }
	| { type: "cols"; start: { row: number; col: number }; end: { row: number; col: number } }
	| { type: "rows"; start: { row: number; col: number }; end: { row: number; col: number } }

export type CellRange = { top: number; left: number; right: number; bottom: number }

type GridSize = { nRows: number; nColumns: number; moreRows: boolean; moreColumns: boolean }

type FetchData<T> = {
	nColumns: number
	nRows: number
	moreRows: boolean
	moreColumns: boolean
	data: T
}

type GridData<T> = {
	range: CellRange
	data: T
}

export function Grid<T>(props: {
	fetch: (range: CellRange) => Promise<FetchData<T>>
	// TODO: fix html div props type here.
	children: (props: any, row: number, col: number, data: T | undefined) => JSX.Element
	rowHeight?: number
	colWidth?: number
	columnGap?: number
	rowGap?: number
	// How much to overfetch when loading more data.
	rowMargin?: number
	colMargin?: number
}) {
	const { rowHeight, colWidth, columnGap, rowGap, rowMargin, colMargin } = defaults(
		{
			rowHeight: 22,
			colWidth: 140,
			columnGap: 1,
			rowGap: 1,
			rowMargin: 20,
			colMargin: 10,
		},
		props
	)

	// ==========================================================================
	// Selection
	// ==========================================================================

	const [renderedRange, setRenderedRange] = useDeepState({ top: 0, left: 0, right: 0, bottom: 0 })
	const [gridData, setGridData] = useDeepState<GridData<T | undefined>>({
		range: { top: 0, left: 0, right: 0, bottom: 0 },
		data: undefined,
	})
	const [gridSize, setGridSize] = useDeepState<GridSize>({
		nColumns: 0,
		nRows: 0,
		moreColumns: true,
		moreRows: true,
	})

	const [isDragging, setIsDragging] = useDeepState(false)
	const [selection, setSelection] = useDeepState<GridSelection | undefined>(undefined)

	const getRowCol = (e: React.MouseEvent<HTMLDivElement>) => {
		const elm = e.target as HTMLElement
		const dataColumnIndex = elm.getAttribute("data-column-index") as string
		const dataRowIndex = elm.getAttribute("data-row-index") as string
		const col = parseInt(dataColumnIndex, 10)
		const row = parseInt(dataRowIndex, 10)
		return { row, col }
	}

	const updateSelection = (selection: GridSelection, focus: boolean) => {
		setSelection(selection)
		if (focus) scrollToSelection(selection)
	}

	const startSelection = (
		type: "cells" | "cols" | "rows",
		row: number,
		col: number,
		focus: boolean
	) => {
		updateSelection({ type: type, start: { row, col }, end: { row, col } }, focus)
	}

	const expandSelectionTo = (
		selection: GridSelection,
		row: number,
		col: number,
		focus: boolean
	) => {
		updateSelection({ ...selection, end: { row, col } }, focus)
	}

	const expandSelectionBy = (
		selection: GridSelection,
		rowOffset: number,
		colOffset: number,
		focus: boolean
	) => {
		const { row, col } = selection.end

		const rowMax = gridSize.nRows - 1
		const colMax = gridSize.nColumns - 1

		if (selection.type === "rows") {
			updateSelection(
				{
					...selection,
					end: { row: clamp(row + rowOffset, 0, rowMax), col: -1 },
				},
				focus
			)
			return
		}
		if (selection.type === "cols") {
			updateSelection(
				{
					...selection,
					end: { row: -1, col: clamp(col + colOffset, 0, colMax) },
				},
				focus
			)
			return
		}
		if (selection.type === "cells") {
			updateSelection(
				{
					...selection,
					end: {
						row: clamp(row + rowOffset, 0, rowMax),
						col: clamp(col + colOffset, 0, colMax),
					},
				},
				focus
			)
			return
		}
	}

	const moveSelectionBy = (
		selection: GridSelection,
		rowOffset: number,
		colOffset: number,
		focus: boolean
	) => {
		const { row, col } = selection.end

		const rowMax = gridSize.nRows - 1
		const colMax = gridSize.nColumns - 1

		if (selection.type === "rows") {
			if (selection.start.row === selection.end.row) {
				startSelection("rows", clamp(row + rowOffset, 0, rowMax), -1, focus)
			} else {
				startSelection("rows", row, -1, focus)
			}
			return
		}

		if (selection.type === "cols") {
			if (selection.start.col === selection.end.col) {
				startSelection("cols", -1, clamp(col + colOffset, 0, colMax), focus)
			} else {
				startSelection("cols", -1, col, focus)
			}
			return
		}

		if (selection.type === "cells") {
			if (selection.start.row === selection.end.row && selection.start.col === selection.end.col) {
				startSelection(
					"cells",
					clamp(row + rowOffset, 0, rowMax),
					clamp(col + colOffset, 0, colMax),
					focus
				)
			} else {
				startSelection("cells", row, col, focus)
			}
			return
		}
	}

	const handleDoubleClickColumnHeader = (e: React.MouseEvent<HTMLDivElement>) => {
		const { row, col } = getRowCol(e)
		startSelection("cols", row, col, false)
	}

	const handleDoubleClickRowHeader = (e: React.MouseEvent<HTMLDivElement>) => {
		const { row, col } = getRowCol(e)
		startSelection("rows", row, col, false)
	}

	const handleClickHeader = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!selection) return
		if (!e.shiftKey) return
		if (selection.type === "cells") return
		const { row, col } = getRowCol(e)
		expandSelectionTo(selection, row, col, false)
	}

	const handleCellMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		const { row, col } = getRowCol(e)
		setIsDragging(true)
		if (!e.shiftKey || !selection) startSelection("cells", row, col, false)
		else expandSelectionTo(selection, row, col, false)
	}

	const handleCellMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!isDragging || !selection) return
		const { row, col } = getRowCol(e)
		expandSelectionTo(selection, row, col, false)
	}

	// We don't want to allow edge scrolling in a direction until a user has started dragging in that direction.
	const [dragDirection, setDragDirection] = useDeepState({
		up: false,
		down: false,
		left: false,
		right: false,
	})

	useDomEvent("mouseup", () => {
		setIsDragging(false)
		setDragDirection({ up: false, down: false, left: false, right: false })
	})

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (!selection) {
			if (e.key === "Enter") {
				e.preventDefault()
				startSelection("cells", 0, 0, true)
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
				expandSelectionBy(selection, offset.row, offset.col, true)
			} else {
				moveSelectionBy(selection, offset.row, offset.col, true)
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
	const updateVisibleRange = () => {
		if (!containerRef.current) return

		const visibleRange = getVisibleRange(containerRef.current, {
			rowHeight,
			rowGap,
			colWidth,
			columnGap,
		})

		// Expand by some margin.
		const expandedRange = expandVisibleRange(visibleRange, { rowMargin, colMargin })

		// Clamp down to the known size of the grid.
		const clampedRange = clampRenderedRange(expandedRange, gridSize)

		// If the visible range is not in the gridData response, then fetch more.
		const loadMoreTop = visibleRange.top < gridData.range.top
		const loadMoreBottom = visibleRange.bottom > gridData.range.bottom
		const loadMoreLeft = visibleRange.left < gridData.range.left
		const loadMoreRight = visibleRange.right > gridData.range.right

		// Overfetch with the expanded range.
		if (loadMoreTop || loadMoreLeft || loadMoreRight || loadMoreBottom) loadMore(clampedRange)
		setRenderedRange(clampedRange)
	}

	const renderedRangeRef = useRefCurrent(renderedRange)
	const gridSizeRef = useRefCurrent(gridSize)
	const fetchRef = useRefCurrent(props.fetch)

	const loadMore = useMemo(() => {
		return debounce(
			async (range: CellRange) => {
				try {
					const fetchData = await fetchRef.current(range)

					// Need to use isEqual because useDeepState may not preseve the value equality.
					if (!isEqual(range, renderedRangeRef.current)) return console.warn("Wasted fetch.")

					// Expand the known gridSize.
					const size = updateGridSize(gridSizeRef.current, fetchData)
					setGridSize(size)

					// Adjust the rendered range to the new gridSize.
					setRenderedRange(clampRenderedRange(range, size))

					// Keep track the results.
					setGridData({ range, data: fetchData.data })
				} catch (error) {
					console.error(error)
				}
			},
			100,
			{ leading: false, trailing: true }
		)
	}, [])

	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		updateVisibleRange()
		if (isDragging) handleEdgeScroll()
	}

	useLayoutEffect(() => {
		updateVisibleRange()
	}, [])

	// ==========================================================================
	// Focus Selection
	// ==========================================================================

	const scrollToSelection = (selection: GridSelection) => {
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

	// ==========================================================================
	// Selection Edge Scroll
	// ==========================================================================

	const scrollRectRef = useRef<DOMRect | null>(null)

	const measureScrollRect = useMemo(() => {
		return throttle(
			() => {
				if (!containerRef.current) return
				scrollRectRef.current = containerRef.current.getBoundingClientRect()
			},
			500,
			{ leading: true }
		)
	}, [])

	const mousePositionRef = useRef({ x: 0, y: 0 })
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			mousePositionRef.current = { x: e.clientX, y: e.clientY }
		}
		window.addEventListener("mousemove", handleMouseMove)
		return () => {
			window.removeEventListener("mousemove", handleMouseMove)
		}
	}, [])

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!isDragging) return

		setDragDirection({
			up: dragDirection.up || e.movementY < 0,
			down: dragDirection.down || e.movementY > 0,
			left: dragDirection.left || e.movementX < 0,
			right: dragDirection.right || e.movementX > 0,
		})

		handleEdgeScroll()
	}

	const handleEdgeScroll = () => {
		measureScrollRect()

		const container = containerRef.current
		if (!container) return

		const scrollRect = scrollRectRef.current
		if (!scrollRect) return

		const yThreshold = container.clientHeight * 0.1
		const xThreshold = container.clientWidth * 0.1

		const currentMouseY = mousePositionRef.current.y
		const currentMouseX = mousePositionRef.current.x

		// Account for sticky header row and column
		const distToTop = currentMouseY - (scrollRect.top + rowHeight)
		const distToLeft = currentMouseX - (scrollRect.left + colWidth)
		const distToBottom = scrollRect.bottom - currentMouseY
		const distToRight = scrollRect.right - currentMouseX

		const speed = (dist: number, threshold: number) => {
			// 0-1 quadratic scale
			const scale = clamp((threshold - dist) / threshold, 0, 1) ** 2

			// This bit is a bit arbitrary. You can kind of assume 60fps.
			const min = 1
			const max = threshold / 15

			return min + (max - min) * scale
		}

		let scrollDelta = { top: 0, left: 0 }

		if (dragDirection.down && distToBottom < yThreshold)
			scrollDelta.top = speed(distToBottom, yThreshold)
		if (dragDirection.up && distToTop < yThreshold) scrollDelta.top = -speed(distToTop, yThreshold)
		if (dragDirection.left && distToLeft < xThreshold)
			scrollDelta.left = -speed(distToLeft, xThreshold)
		if (dragDirection.right && distToRight < xThreshold)
			scrollDelta.left = speed(distToRight, xThreshold)

		if (scrollDelta.top !== 0 || scrollDelta.left !== 0) container.scrollBy(scrollDelta)
	}

	// If we don't know the size of the grid yet, use the rendered range.
	const gridRows = gridSize.moreRows
		? Math.max(renderedRange.bottom, gridSize.nRows)
		: gridSize.nRows
	const gridCols = gridSize.moreColumns
		? Math.max(renderedRange.right, gridSize.nColumns)
		: gridSize.nColumns
	const gridHeight = (gridRows + 1) * rowHeight + gridRows * rowGap
	const gridWidth = (gridCols + 1) * colWidth + gridCols * columnGap

	const nVisibleRows = renderedRange.bottom - renderedRange.top + 1
	const nVisibleCols = renderedRange.right - renderedRange.left + 1

	return (
		<div
			ref={containerRef}
			style={{ width: "100%", height: "100%", overflow: "auto", position: "relative" }}
			onKeyDown={handleKeyDown}
			onScroll={handleScroll}
			onMouseMove={handleMouseMove}
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
							top: renderedRange.top * (rowHeight + rowGap),
							left: renderedRange.left * (colWidth + columnGap),

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
							const col = renderedRange.left + i

							return props.children(
								{
									key: `header-${col}`,
									style: {
										width: colWidth,
										height: rowHeight,
										backgroundColor: "var(--background2)",
										position: "sticky",
										top: 0,
										zIndex: 1,
										textAlign: "center",
										fontWeight: "bold",
										...cellStyle(row, col),
									},
									"data-column-index": col,
									"data-row-index": row,
									onClick: handleClickHeader,
									onDoubleClick: handleDoubleClickColumnHeader,
								},
								row,
								col,
								gridData.data
							)
							// return (
							// 	<div
							// 		key={`header-${col}`}
							// 		style={{
							// 			width: colWidth,
							// 			height: rowHeight,
							// 			backgroundColor: "var(--background2)",
							// 			position: "sticky",
							// 			top: 0,
							// 			zIndex: 1,
							// 			textAlign: "center",
							// 			fontWeight: "bold",
							// 			...cellStyle(row, col),
							// 		}}
							// 		data-column-index={col}
							// 		data-row-index={row}
							// 		onClick={handleClickHeader}
							// 		onDoubleClick={handleDoubleClickColumnHeader}
							// 	>
							// 		Column {col + 1}
							// 	</div>
							// )
						})}

						{/* Row headers and cells */}
						{Array.from({ length: nVisibleRows }).map((_, i) => {
							const row = renderedRange.top + i
							const col = -1

							return (
								<React.Fragment key={`row-${row}`}>
									{/* Row header */}
									{/* <div
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
									</div> */}
									{props.children(
										{
											"data-type": "header-row",
											style: {
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
											},
											"data-column-index": col,
											"data-row-index": row,
											onClick: handleClickHeader,
											onDoubleClick: handleDoubleClickRowHeader,
										},
										row,
										col,
										gridData.data
									)}

									{/* Cells */}
									{Array.from({ length: nVisibleCols }).map((_, j) => {
										const col = renderedRange.left + j
										const index = [row, col].toString()

										// return (
										// 	<div
										// 		key={index}
										// 		style={{
										// 			width: colWidth,
										// 			height: rowHeight,
										// 			userSelect: isDragging ? "none" : undefined,
										// 			...cellStyle(row, col),
										// 		}}
										// 		className="hover"
										// 		data-row-index={row}
										// 		data-column-index={col}
										// 		onMouseDown={handleCellMouseDown}
										// 		onMouseEnter={handleCellMouseEnter}
										// 	>
										// 		{index}
										// 	</div>
										// )

										return props.children(
											{
												key: index,
												style: {
													width: colWidth,
													height: rowHeight,
													userSelect: isDragging ? "none" : undefined,
													...cellStyle(row, col),
												},
												className: "hover",
												"data-row-index": row,
												"data-column-index": col,
												onMouseDown: handleCellMouseDown,
												onMouseEnter: handleCellMouseEnter,
											},
											row,
											col,
											gridData.data
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

// TODO: is this off by one for the headers?
const getVisibleRange = (
	container: HTMLDivElement,
	args: {
		rowHeight: number
		rowGap: number
		colWidth: number
		columnGap: number
	}
) => {
	const { rowHeight, rowGap, colWidth, columnGap } = args
	const { scrollTop, scrollLeft, clientHeight, clientWidth } = container

	const startRow = Math.floor(scrollTop / (rowHeight + rowGap))
	const endRow = Math.ceil((scrollTop + clientHeight) / (rowHeight + rowGap))
	const startCol = Math.floor(scrollLeft / (colWidth + columnGap))
	const endCol = Math.ceil((scrollLeft + clientWidth) / (colWidth + columnGap))

	return { top: startRow, left: startCol, bottom: endRow, right: endCol }
}

const expandVisibleRange = (range: CellRange, args: { rowMargin: number; colMargin: number }) => {
	const { rowMargin, colMargin } = args
	return {
		top: Math.max(0, range.top - rowMargin),
		left: Math.max(0, range.left - colMargin),
		bottom: range.bottom + rowMargin,
		right: range.right + colMargin,
	}
}

// This doesn't just clamp, but will actually offset back to a valid range.
const clampRenderedRange = (range: CellRange, gridSize: GridSize) => {
	let newRange = { ...range }
	if (!gridSize.moreRows) {
		if (newRange.bottom > gridSize.nRows - 1) {
			const offset = newRange.bottom - (gridSize.nRows - 1)
			newRange.top -= offset
			newRange.bottom -= offset
		}
	}
	if (!gridSize.moreColumns) {
		if (newRange.right > gridSize.nColumns - 1) {
			const offset = newRange.right - (gridSize.nColumns - 1)
			newRange.left -= offset
			newRange.right -= offset
		}
	}
	return newRange
}

const updateGridSize = (gridSize: GridSize, data: FetchData<any>) => {
	const size = { ...gridSize }

	if (data.nColumns >= size.nColumns) {
		size.nColumns = data.nColumns
		size.moreColumns = data.moreColumns
	}

	if (data.nRows >= size.nRows) {
		size.nRows = data.nRows
		size.moreRows = data.moreRows
	}

	return size
}
