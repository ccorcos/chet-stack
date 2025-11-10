import { capitalize } from "lodash-es"
import React, { Fragment, Suspense, useLayoutEffect, useRef, useState } from "react"
import { randomId } from "shared/randomId"
import { Button } from "ui/components/Button"
import { DropdownMenu } from "ui/components/DropdownMenu"
import { Input } from "ui/components/Input"
import { ContentLayout, Layout, LeftPanelLayout } from "ui/components/Layout"
import { ListBox, ListItem, useListBox } from "ui/components/ListBox"
import { MenuItem } from "ui/components/MenuItem"
import { Popup } from "ui/components/Popup"
import { HeaderCell, Table } from "ui/components/Table"
import { Subspace } from "../components/Subspace"
import { useGet, useList, useWrite } from "../hooks/useDatabase"
import { usePref } from "../hooks/usePref"

export function AirtableDemo() {
	return (
		<Subspace prefix={["AirtableDemo5"]}>
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

type Property = { id: string; name: string; type: PropertyType }

type Schema = {
	id: string
	name: string
	properties: Property[]
}

type RecordValue = {
	id: string
} & Record<string, any>

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
				{/* {selected.length > 0 && <SchemaEditor schemaId={selected[0]} />} */}
				<Suspense>{selected.length > 0 && <Records schemaId={selected[0]} />}</Suspense>
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
		const schema: Schema = {
			id: randomId(),
			name: "",
			properties: [
				{ id: "id", name: "ID", type: { type: "string" } },
				{ id: "name", name: "Name", type: { type: "string" } },
			],
		}
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
				{schema.properties.map((property) => (
					<div key={property.id}>{property.name || "Untitled"}</div>
				))}
			</div>
			<NewPropertyButton
				onNewProperty={(type) => {
					const properties = schema.properties
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

function Records(props: { schemaId: string }) {
	const { schemaId } = props
	const schemaResult = useGet(["schema", schemaId])
	if (schemaResult.localResult.miss) throw schemaResult.remoteResult.promise

	const schema = schemaResult.localResult.hit as Schema

	const initialWidths = schema.properties.map(() => 300)
	const [savedColumnWidths, setColumnWidths] = usePref(
		`schema/${schemaId}/columnWidths`,
		initialWidths
	)
	const columnWidths = [...initialWidths]
	for (let i = 0; i < Math.min(columnWidths.length, savedColumnWidths.length); i++)
		columnWidths[i] = savedColumnWidths[i]

	const gap = 1
	const minWidth = 100

	const setWidth = (index: number) => (width: number) => {
		const newWidths = [...columnWidths]
		newWidths[index] = width
		setColumnWidths(newWidths)
	}

	const recordsResult = useList({
		gt: ["record", schemaId],
		lt: ["record", schemaId, null],
	})
	if (recordsResult.localResult.miss) throw recordsResult.remoteResult.promise
	const records: RecordValue[] = (
		recordsResult.localResult.hit ||
		recordsResult.localResult.prefix ||
		[]
	).map((x) => x.value)

	const write = useWrite()
	const newRecord = () => {
		const record: RecordValue = { id: randomId() }
		write({ set: [{ key: ["record", schemaId, record.id], value: record }] })
	}

	return (
		<div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
			<Table gap={gap} columnWidths={columnWidths} setColumnWidths={setColumnWidths}>
				{schema.properties.map((property, i) => {
					return (
						<HeaderCell
							key={property.id}
							width={columnWidths[i]}
							minWidth={minWidth}
							setWidth={setWidth(i)}
							style={{ backgroundColor: "var(--bg1)", padding: 4 }}
						>
							{property.name}
						</HeaderCell>
					)
				})}

				{records.map((record) => {
					return (
						<Fragment key={record.id}>
							{schema.properties.map((property) => (
								<div key={property.id} style={{ padding: 4 }}>
									{record[property.id]}
								</div>
							))}
						</Fragment>
					)
				})}
			</Table>
			<div>
				<Button onClick={newRecord}>New Record</Button>
			</div>
		</div>
	)
}
