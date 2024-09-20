import React from "react"
import { TupleDatabase, TupleDatabaseClient } from "tuple-database"
import { BrowserTupleStorage } from "tuple-database/storage/BrowserTupleStorage"
import { useTupleDatabase } from "tuple-database/useTupleDatabase"
import { NakedButton } from "../Button"
import { ComboBoxSelect } from "../ComboBox"
import { NakedInput } from "../Input"

type Property =
	| { id: string; name?: string; type: "string" }
	| { id: string; name?: string; type: "number" }
	| { id: string; name?: string; type: "boolean" }
	| { id: string; name?: string; type: "select"; options?: string[] }

type Schema = {
	id: string
	properties: Property[]
}

const PlantSchema: Schema = {
	id: "plants",
	properties: [
		// { id: "id", type: "string" },
		{ id: "name", type: "string" },
		{ id: "height", name: "Height (m)", type: "number" },
		{ id: "nitrogen", name: "Nitrogen Fixing", type: "boolean" },
		{
			id: "layer",
			name: "Forest Layer",
			type: "select",
			options: ["Canopy", "Understory", "Shrub", "Herb", "Ground Cover", "Climbing", "Aquatic"],
		},
	],
}

type Row = { id: string; [propertyId: string]: string | number | boolean | undefined }

// Storage layer...
// objects all have ids.
// operations / write are centrally applied.

const db = new TupleDatabaseClient<any>(new TupleDatabase(new BrowserTupleStorage("data")))

if (db.scan({ limit: 1 }).length === 0) {
	db.commit({
		set: [
			{ key: ["row1"], value: { id: "row1" } },
			{ key: ["row2"], value: { id: "row2" } },
			{ key: ["row3"], value: { id: "row3" } },
			{ key: ["row4"], value: { id: "row4" } },
		],
	})
}

// type RowSelection = {
// 	type: "row"
// 	rowIds: string[]
// }

// type ColumnSelection = {
// 	type: "column"
// 	propertyIds: string[]
// }

// type CellSelection = {
// 	top: number
// 	left: number
// 	right: number
// 	bottom: number
// }

// type TableSelection = RowSelection | ColumnSelection | CellSelection

export function TableDemo() {
	const nColumns = PlantSchema.properties.length

	const cell: React.CSSProperties = {
		padding: 4,
	}
	const header: React.CSSProperties = {
		...cell,
		position: "sticky",
		top: 0,
		backgroundColor: "#f0f0f0",
		fontWeight: "bold",
		zIndex: 1,
	}

	const rows = useTupleDatabase(db, (tx) => tx.scan(), [])

	return (
		<div style={{ padding: 12 }}>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: `repeat(${nColumns + 1}, 1fr)`,
					gap: 1,
					// border: "1px solid black",
				}}
			>
				<div style={header}>id</div>
				{PlantSchema.properties.map((prop) => {
					return (
						<div key={prop.id} style={header}>
							{prop.name || prop.id}
						</div>
					)
				})}

				{rows.map((row) => {
					const obj = row.value

					return (
						<React.Fragment key={obj.id}>
							<div style={cell}>{obj.id}</div>
							{PlantSchema.properties.map((prop) => {
								// const type = prop.type
								const value = obj[prop.id]
								return (
									<div key={prop.id} style={cell}>
										{/* {value || "_"} */}
										<PropertyValue obj={obj} property={prop} />
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

function PropertyValue(props: { obj: Row; property: Property }) {
	const { obj, property } = props

	const update = (value: any) => {
		db.commit({
			set: [{ key: [obj.id], value: { ...obj, [property.id]: value } }],
		})
	}

	let value = obj[property.id]

	if (property.type === "string") {
		if (value === undefined) value = ""
		value = value.toString()
		return <NakedInput value={value} onChange={(e) => update(e.target.value)} />
	}

	if (property.type === "number") {
		if (typeof value === "string") value = parseFloat(value)
		if (typeof value === "boolean") value = value === true ? 1 : 0
		if (value === undefined || isNaN(value)) value = ""
		return <NakedInput type="number" value={value} onChange={(e) => update(e.target.value)} />
	}

	if (property.type === "boolean") {
		if (value === undefined || value === "") value = false
		if (typeof value === "string") value = true
		if (typeof value === "number") value = value > 0
		return <NakedInput type="checkbox" checked={value} onChange={(e) => update(e.target.checked)} />
	}

	if (property.type === "select") {
		const options = property.options || []
		if (!options.includes(value as any)) value = undefined

		return (
			<ComboBoxSelect
				items={property.options || []}
				placeholder="Select"
				value={value as any}
				onChange={update}
				Button={NakedButton}
			/>
		)
	}

	return <>?</>
}

// TODO:
// - combobox with naked input.

// - add rows
// - delete / duplicate rows
// - edit the schema
// - edit the schema
// - row selection
// - selection and moving
// - edit the schema
