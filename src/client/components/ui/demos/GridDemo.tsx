import { clamp } from "lodash-es"
import React from "react"
import { sleep } from "../../../../shared/sleep"
import { CellRange, Grid } from "../Grid"

// TODO:
// - drag to re-order rows and columns
// - click cell to edit
// - click header to edit
// - copy / paste

export function GridDemo() {
	const nColumns = 100
	const nRows = 400

	const fetchCells = (range: CellRange) => {
		const resultRange = {
			top: clamp(range.top, 0, nRows - 1),
			left: clamp(range.left, 0, nColumns - 1),
			right: clamp(range.right, 0, nColumns - 1),
			bottom: clamp(range.bottom, 0, nRows - 1),
		}
		const rows: Record<number, Record<number, string>> = {}
		for (let i = resultRange.top; i <= resultRange.bottom; i++) {
			const cols: Record<number, string> = {}
			for (let j = resultRange.left; j <= resultRange.right; j++) {
				cols[j] = "cell-" + [i, j].toString()
			}
			cols[-1] = "row-" + i
			rows[i] = cols
		}

		rows[-1] = {}
		for (let j = resultRange.left; j <= resultRange.right; j++) {
			rows[-1][j] = "col-" + j
		}

		return {
			nColumns,
			nRows,
			data: rows,
		}
	}

	return (
		<Grid
			fetch={async (range: CellRange) => {
				await sleep(200)
				return fetchCells(range)
			}}
		>
			{(props, row, col, data) => {
				let content = "."
				if (data) {
					content = "-"
					const value = data[row]?.[col]
					if (value !== undefined) content = value
				}
				return <div {...props}>{content}</div>
			}}
		</Grid>
	)
}
