import React from "react"

export function GridSelectionDemo() {
	const nColumns = 40
	const nRows = 140

	const [selection, setSelection] = React.useState<{
		top: number
		left: number
		right: number
		bottom: number
	} | null>(null)

	const [isDragging, setIsDragging] = React.useState(false)
	const [startCell, setStartCell] = React.useState<{ row: number; col: number } | null>(null)

	const handleMouseDown = (row: number, col: number) => {
		setIsDragging(true)
		setStartCell({ row, col })
		setSelection({ top: row, left: col, bottom: row, right: col })
	}

	const handleMouseEnter = (row: number, col: number) => {
		if (isDragging && startCell) {
			setSelection({
				top: Math.min(startCell.row, row),
				left: Math.min(startCell.col, col),
				bottom: Math.max(startCell.row, row),
				right: Math.max(startCell.col, col),
			})
		}
	}

	const handleMouseUp = () => {
		setIsDragging(false)
	}

	React.useEffect(() => {
		document.addEventListener("mouseup", handleMouseUp)
		return () => {
			document.removeEventListener("mouseup", handleMouseUp)
		}
	}, [])

	const isCellSelected = (row: number, col: number) => {
		if (!selection) return false
		return (
			row >= selection.top &&
			row <= selection.bottom &&
			col >= selection.left &&
			col <= selection.right
		)
	}

	return (
		<div style={{ width: "100%", height: "100%", overflow: "auto" }}>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: `auto repeat(${nColumns}, 1fr)`,
					width: "fit-content",
					gap: 1,
					userSelect: "none",
				}}
			>
				{/* Top row */}
				<div
					style={{
						position: "sticky",
						top: 0,
						left: 0,
						zIndex: 2,
						backgroundColor: "var(--background)",
					}}
				></div>
				{Array.from({ length: nColumns }).map((_, colIndex) => (
					<div
						key={`header-${colIndex}`}
						style={{
							height: 22,
							width: 120,
							backgroundColor: "var(--background2)",
							position: "sticky",
							top: 0,
							zIndex: 1,
							textAlign: "center",
							fontWeight: "bold",
						}}
					>
						Column {colIndex + 1}
					</div>
				))}

				{Array.from({ length: nRows }).map((_, rowIndex) => (
					<React.Fragment key={`row-${rowIndex}`}>
						{/* Left column */}
						<div
							style={{
								height: 22,
								width: 80,
								backgroundColor: "var(--background2)",
								position: "sticky",
								left: 0,
								zIndex: 1,
								textAlign: "center",
								fontWeight: "bold",
							}}
						>
							Row {rowIndex + 1}
						</div>

						{Array.from({ length: nColumns }).map((_, colIndex) => {
							const index = rowIndex * nColumns + colIndex
							return (
								<div
									key={index}
									style={{
										height: 22,
										width: 120,
										backgroundColor: isCellSelected(rowIndex, colIndex)
											? "var(--hover)"
											: undefined,
										userSelect: isDragging ? "none" : undefined,
									}}
									className="hover"
									onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
									onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
								>
									{index}
								</div>
							)
						})}
					</React.Fragment>
				))}
			</div>
		</div>
	)
}
