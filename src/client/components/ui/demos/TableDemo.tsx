import React, { useState } from "react"
import { TupleDatabase, TupleDatabaseClient } from "tuple-database"
import { BrowserTupleStorage } from "tuple-database/storage/BrowserTupleStorage"
import { randomId } from "../../../../shared/randomId"
import { useCounter } from "../../../hooks/useCounter"
import { useSuspense } from "../../../hooks/useSuspense"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { Button, NakedButton } from "../Button"
import { ComboBoxSelect } from "../ComboBox"
import { Grid } from "../Grid"
import { NakedInput } from "../Input"
import { ListBox, ListItem } from "../ListBox"

type Property =
	| { id: string; name?: string; type: "string" }
	| { id: string; name?: string; type: "number" }
	| { id: string; name?: string; type: "boolean" }
	| { id: string; name?: string; type: "select"; options?: string[] }

type Schema = {
	id: `schema:${string}`
	name: string
	properties: Property[]
}

type TableView = {
	id: `view:${string}`
	name: string
	schemaId: `schema:${string}`
	columns: { propertyId: string; width?: number }[]
	// filter, sort
}

type Record = {
	id: `record:${string}`
	properties: {
		[propertyId: string]: string | number | boolean | undefined
	}
}

const PlantSchema: Schema = {
	id: "schema:plants",
	name: "Plants",
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

const PlantView: TableView = {
	id: "view:plants",
	name: "Plants",
	schemaId: "schema:plants",
	columns: [
		{ propertyId: "name" },
		{ propertyId: "height" },
		{ propertyId: "nitrogen" },
		{ propertyId: "layer" },
	],
}

// ["schema", id]: Schema
// ["view", id]: TableView
// ["record", id]: Record

// ["schemaList", index, id]: null
// ["schemaRecords", id, id]: null
// ["schemaViewList", id, index, id]: null
// ["viewRecordList", id, index, id]: null

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

type SchemaList = {
	id: "schemaList"
	schemas: `schema:${string}`[]
}

export function TableDemo() {
	const { api } = useClientEnvironment()

	const [n, inc] = useCounter()
	const schemas = useSuspense("load schemas" + n, async () => {
		const response = await api.query(["get", "schemaList"])
		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		console.log(response)
		if (!response.body) return { id: "schemaList", schemas: [] } as SchemaList
		return JSON.parse(response.body) as SchemaList
	})

	const [selectedIndex, setSelectedIndex] = useState<number | undefined>()

	const selectedSchemaId = selectedIndex === undefined ? undefined : schemas.schemas[selectedIndex]

	return (
		<div style={{ display: "flex", gap: 12 }}>
			<div>
				<ListBox
					items={schemas.schemas}
					selectedIndex={selectedIndex}
					onSelectIndex={setSelectedIndex}
					autoFocus={true}
				>
					{(id, props) => (
						<ListItem {...props}>
							<SchemaName id={id} />
						</ListItem>
					)}
				</ListBox>
				<Button
					onClick={async () => {
						const newSchema: Schema = {
							id: `schema:${randomId()}`,
							name: "",
							properties: [
								{ id: "name", type: "string" },
								{
									id: "tags",
									name: "Tags",
									type: "select",
									options: [],
								},
							],
						}

						await api.query([
							"write",
							{
								set: [
									{
										key: "schemaList",
										value: JSON.stringify({
											id: "schemaList",
											schemas: [...schemas.schemas, newSchema.id],
										}),
									},
									{ key: newSchema.id, value: JSON.stringify(newSchema) },
								],
							},
						])
						inc()

						setSelectedIndex((i) => (i === undefined ? 0 : i + 1))
					}}
				>
					New Schema
				</Button>
			</div>
			<div>{selectedSchemaId && <DisplaySchema id={selectedSchemaId} />}</div>
		</div>
	)
}

function DisplaySchema(props: { id: `schema:${string}` }) {
	const { api } = useClientEnvironment()
	const schema = useSuspense(props.id, async () => {
		const response = await api.query(["get", props.id])
		return response.status === 200 ? (JSON.parse(response.body) as Schema) : undefined
	})

	return <div>{JSON.stringify(schema, null, 2)}</div>
}

export function SchemaName(props: { id: `schema:${string}` }) {
	const { id } = props
	const { api } = useClientEnvironment()

	const schema = useSuspense(`schema ${id}`, async () => {
		const response = await api.query(["get", id])
		return response.status === 200 ? (response.body as Schema) : undefined
	})

	return <>{schema?.name || "Untitled"}</>
}

export function TableDemo2() {
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

	return (
		<Grid
			fetch={async (range) => {
				const rows = db.scan()
				return {
					nRows: rows.length,
					nColumns: 100,
					moreRows: false,
					moreColumns: false,
					data: rows,
				}
			}}
		>
			{(props, row, col, data) => {
				const prop = PlantSchema.properties[col]
				if (row === -1) {
					if (!prop) return <div {...props}>-</div>
					return <div {...props}>{prop.name || prop.id}</div>
				}

				const obj = data?.[row]
				if (col === -1) {
					return <div {...props}>{obj.id}</div>
				}

				return <div {...props}>{obj && prop && <PropertyValue obj={obj} property={prop} />}</div>
			}}
		</Grid>
	)
}

function PropertyValue(props: { obj: Record; property: Property }) {
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
