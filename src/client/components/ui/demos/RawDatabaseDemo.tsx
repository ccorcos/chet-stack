import React from "react"
import { OrderedKeyValueApi } from "../../../../shared/database/types"
import { FnCallProxy } from "../../../../shared/fnCall"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { CellRange, Grid } from "../Grid"

const db = FnCallProxy<OrderedKeyValueApi<string, string>>()

export function RawDatabaseDemo() {
	const { api } = useClientEnvironment()

	const fetchCells = async (range: CellRange) => {
		const response = await api.query(db.list({ limit: range.bottom + 1 }))

		if (response.status !== 200) throw new Error(response.status.toString())
		const result = response.body

		return {
			nColumns: 1, // key is the header.
			// Heres a trick if you don't actually know the number of rows.
			nRows: result.length > range.bottom ? range.bottom + 500 : result.length,
			data: result,
		}
	}

	return (
		<Grid fetch={fetchCells}>
			{(props, row, col, data) => {
				let content = "."

				if (data !== undefined) {
					if (col === -1) content = data[row]?.key
					if (col === 0) content = data[row]?.value
				}

				if (row === -1) {
					if (col === -1) content = "key"
					if (col === 0) content = "value"
				}

				return (
					<div {...props} style={{ ...props.style, overflow: "hidden" }}>
						{content}
					</div>
				)
			}}
		</Grid>
	)
}
