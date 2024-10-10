import React from "react"
import { OrderedKeyValueApi } from "../../../../shared/database/types"
import { FnCallProxy } from "../../../../shared/fnCall"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { CellRange, Grid } from "../Grid"

const db = FnCallProxy<OrderedKeyValueApi<string, string>>()

export function RawDatabaseDemo() {
	const { api } = useClientEnvironment()

	const fetchCells = async (range: CellRange) => {
		// {bottom: 2} means we're requesting 3 rows. But we also want to fetch one more to check if there's a next page.
		const response = await api.query(db.list({ limit: range.bottom + 2 }))
		if (response.status !== 200) throw new Error(response.status.toString())
		const result = response.body

		console.log("FETCH", range, result.length, result.length > range.bottom)

		return {
			nColumns: 1, // key is the header.
			moreColumns: false,
			nRows: result.length,
			moreRows: result.length > range.bottom + 1,
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
