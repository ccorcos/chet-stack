import React from "react"
import { OrderedKeyValueApi } from "../../../../shared/database/types"
import { FnCallProxy } from "../../../../shared/fnCall"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { CellRange, Grid } from "../Grid"

const db = FnCallProxy<OrderedKeyValueApi<string, string>>()

export function RawDatabaseDemo() {
	const nColumns = 100
	const nRows = 400

	const { api } = useClientEnvironment()

	const fetchCells = async (range: CellRange) => {
		const response = await api.query(db.list({ limit: range.bottom + 1 }))
		if (response.status !== 200) throw new Error(response.status.toString())
		const result = response.body

		result.map(({ key, value }) => {})

		return {
			nColumns: 1, // key is the header.
			moreColumns: false,
			nRows: result.length,
			moreRows: result.length > range.bottom,
			data: result,
		}
	}

	return (
		<Grid
			fetch={async (range: CellRange) => {
				return fetchCells(range)
			}}
		>
			{(props, row, col, data) => {
				let content = "."

				if (row === -1) {
					if (col === 0) content = "key"
					if (col === 1) content = "value"
				}

				if (data !== undefined) {
					if (col === -1) content = data[row]?.key
					if (col === 0) content = data[row]?.value
				}

				return <div {...props}>{content}</div>
			}}
		</Grid>
	)
}
