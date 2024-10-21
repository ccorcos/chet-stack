import React from "react"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { CellRange, Grid } from "../Grid"

const columns = [
	"﻿Common Name",
	"Scientific Name",
	"Climate",
	"Forest Layer",
	"Leaf Cycle",
	"CA Native",
	"Nitrogen Fixing",
	"Drought Tolerant",
	"Water Needs",
	"Shade Tolerant",
	"Pollinator Attractor",
	"Butterfly Habitat",
	"Hummingbird Habitat",
	"Dragonfly Habitat",
	"Invasive",
	"Growth Rate",
	"Biomass Accumulator",
	"Deep Roots / Erosion Control",
	"Coppiceable",
	"Status",
]

export function PlantDatabaseDemo() {
	const { api } = useClientEnvironment()

	const fetchCells = async (range: CellRange) => {
		const response = await api.list({
			gte: "plants\x00",
			lt: "plants\xff",
			limit: range.bottom + 1,
		})
		if (response.status !== 200) throw new Error(response.status.toString())
		const result = response.body.map(({ key, value }) => ({ key, value: JSON.parse(value) }))

		return {
			nColumns: columns.length,
			nRows: result.length > range.bottom ? range.bottom + 100 : result.length,
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
					content = columns[col]
				} else if (data !== undefined) {
					if (col === -1) content = row.toString()
					else content = data[row]?.value?.[columns[col]]
					// content = row.toString()
				}

				return (
					<div {...props} style={{ ...props.style }}>
						{content}
					</div>
				)
			}}
		</Grid>
	)
}
