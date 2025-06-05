import { capitalize } from "lodash"
import React, { useLayoutEffect, useRef, useState } from "react"
import { randomId } from "../../../../shared/randomId"
import { useGet, useList, useWrite } from "../../../hooks/useDatabase"
import { Subspace } from "../../Subspace"
import { Button } from "../Button"
import { DropdownMenu } from "../DropdownMenu"
import { Input } from "../Input"
import { ContentLayout, Layout, LeftPanelLayout } from "../Layout"
import { ListBox, ListItem, useListBox } from "../ListBox"
import { MenuItem } from "../MenuItem"
import { Popup } from "../Popup"

export function AirtableDemo() {
	return (
		<Subspace prefix={["AirtableDemo4"]}>
			<Airtable />
		</Subspace>
	)
}

type PrimitivePropertyType =
	| { type: "string" }
	| { type: "number" }
	| { type: "boolean" }
	| { type: "relation" }

type PropertyType = PrimitivePropertyType | { type: "list"; item: PrimitivePropertyType }

type Property = { id: string; name?: string; type: PropertyType }

type Schema = {
	id: string
	name?: string
	properties?: Property[]
}

function Airtable() {
	const { localResult } = useList({
		gt: ["schema"],
		lt: ["schema", null],
	})

	const result = localResult.hit || localResult.prefix
	const schemas = result?.map((item) => item.value as Schema)

	const [selected, setSelected] = useState<string[]>([])

	// Annoying how this creates an extra render.
	useLayoutEffect(() => {
		if (schemas && schemas.length > 0) setSelected([schemas[0].id])
	}, [Boolean(schemas)])

	return (
		<Layout
			LeftPanel={
				<LeftPanelLayout className="layer" style={{ padding: 8 }}>
					{schemas ? (
						<SchemaList schemas={schemas} selected={selected} setSelected={setSelected} />
					) : (
						<div>Loading...</div>
					)}
				</LeftPanelLayout>
			}
		>
			<ContentLayout style={{ padding: 8 }}>
				{selected.length > 0 && <SchemaEditor schemaId={selected[0]} />}
			</ContentLayout>
		</Layout>
	)
}

function SchemaList(props: {
	schemas: Schema[]
	selected: string[]
	setSelected: (selected: string[]) => void
}) {
	const { schemas, selected, setSelected } = props

	const { onClick, onKeyDown } = useListBox({
		list: schemas.map((s) => s.id),
		selected,
		setSelected,
		multiselect: true,
	})

	const write = useWrite()

	const handleNewSchema = () => {
		const schema: Schema = { id: randomId() }
		write({ set: [{ key: ["schema", schema.id], value: schema }] })
		setSelected([schema.id])
	}

	return (
		<ListBox
			onClick={onClick}
			onKeyDown={onKeyDown}
			style={{ display: "flex", flexDirection: "column", gap: 4 }}
		>
			{schemas.map((schema) => (
				<ListItem
					key={schema.id}
					item={schema}
					selected={selected.includes(schema.id)}
					style={{ padding: 4, borderRadius: 4 }}
				>
					{schema.name || "Untitled"}
				</ListItem>
			))}
			<div>
				<Button onClick={handleNewSchema}>New Schema</Button>
			</div>
		</ListBox>
	)
}

function SchemaEditor(props: { schemaId: string }) {
	const { schemaId } = props

	const { localResult } = useGet(["schema", schemaId])
	if (localResult.miss) return <div>Loading...</div>
	const schema = localResult.hit as Schema

	const write = useWrite()
	const setSchema = (schema: Schema) => {
		write({ set: [{ key: ["schema", schema.id], value: schema }] })
	}

	return (
		<div>
			<Input
				value={schema.name || ""}
				onChange={(e) => setSchema({ ...schema, name: e.target.value })}
			/>
			<div>
				{schema.properties?.map((property) => (
					<div key={property.id}>{property.name || "Untitled"}</div>
				))}
			</div>
			<NewPropertyButton
				onNewProperty={(type) => {
					const properties = schema.properties || []
					const newProperty: Property = {
						id: randomId(),
						type,
						name: capitalize(type.type === "list" ? type.item.type + "s" : type.type),
					}
					setSchema({
						...schema,
						properties: [...properties, newProperty],
					})
				}}
			/>
		</div>
	)
}

const propertyTypes: PropertyType[] = [
	{ type: "string" },
	{ type: "number" },
	{ type: "boolean" },
	{ type: "relation" },
	{ type: "list", item: { type: "string" } },
	{ type: "list", item: { type: "number" } },
	{ type: "list", item: { type: "boolean" } },
	{ type: "list", item: { type: "relation" } },
]

function NewPropertyButton(props: { onNewProperty: (type: PropertyType) => void }) {
	const buttonRef = useRef<HTMLButtonElement>(null)
	const [open, setOpen] = useState(false)

	const handleDismiss = () => {
		setOpen(false)
		buttonRef.current?.focus()
	}

	return (
		<>
			<Button ref={buttonRef} onClick={() => setOpen(true)}>
				New Property
			</Button>
			<Popup open={open} anchor={buttonRef.current} onDismiss={handleDismiss}>
				<DropdownMenu style={{ minWidth: 120 }}>
					{propertyTypes.map((type, i) => (
						<MenuItem
							key={i}
							onClick={() => {
								handleDismiss()
								props.onNewProperty(type)
							}}
						>
							{capitalize(type.type === "list" ? `List of ${type.item.type}` : type.type)}
						</MenuItem>
					))}
				</DropdownMenu>
			</Popup>
		</>
	)
}

// function RecordTable() {
// 	const [columnWidths, setColumnWidths] = usePref("TableDemo:columnWidths", [100, 200, 300])

// 	const gap = 12
// 	const minWidth = 100

// 	const setWidth = (index: number) => (width: number) => {
// 		const newWidths = [...columnWidths]
// 		newWidths[index] = width
// 		setColumnWidths(newWidths)
// 	}

// 	return (
// 		<div style={{ height: "100%", display: "flex", padding: 12 }}>
// 			<Table gap={gap} columnWidths={columnWidths} setColumnWidths={setColumnWidths}>
// 				<HeaderCell
// 					width={columnWidths[0]}
// 					minWidth={minWidth}
// 					setWidth={setWidth(0)}
// 					style={{ border: "1px solid red", backgroundColor: "var(--bg0)" }}
// 				>
// 					Col 1
// 				</HeaderCell>
// 				<HeaderCell
// 					width={columnWidths[1]}
// 					minWidth={minWidth}
// 					setWidth={setWidth(1)}
// 					style={{ border: "1px solid blue", backgroundColor: "var(--bg0)" }}
// 				>
// 					Col 2
// 				</HeaderCell>
// 				<HeaderCell
// 					width={columnWidths[2]}
// 					minWidth={minWidth}
// 					setWidth={setWidth(2)}
// 					style={{ border: "1px solid green", backgroundColor: "var(--bg0)" }}
// 				>
// 					Col 3
// 				</HeaderCell>
// 				{Array.from({ length: 100 }).map((_, i) => (
// 					<React.Fragment key={i}>
// 						<div style={{ border: "1px solid red" }}>Row {i} Col 1</div>
// 						<div style={{ border: "1px solid blue" }}>Row {i} Col 2</div>
// 						<div style={{ border: "1px solid green" }}>Row {i} Col 3</div>
// 					</React.Fragment>
// 				))}
// 			</Table>
// 		</div>
// 	)
// }
