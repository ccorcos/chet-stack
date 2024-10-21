import React, { useState } from "react"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { CellRange, Grid } from "../Grid"
import { Input } from "../Input"

export function RawDatabaseDemo() {
	const { api } = useClientEnvironment()

	const [prefix, setPrefix] = useState("")

	const fetchCells = async (range: CellRange) => {
		const response = await api.list({
			limit: range.bottom + 1,
			gte: prefix + "\x00",
			lte: prefix + "\xff",
		})

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
		<div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
			<Input placeholder="Prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
			<Grid key={prefix} fetch={fetchCells}>
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
		</div>
	)
}
