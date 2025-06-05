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

type Table = {
	id: string
	name?: string
	properties?: Property[]
}

function Airtable() {
	const { localResult } = useList({
		gt: ["table"],
		lt: ["table", null],
	})

	const result = localResult.hit || localResult.prefix
	const tables = result?.map((item) => item.value as Table)

	const [selected, setSelected] = useState<string[]>([])

	// Annoying how this creates an extra render.
	useLayoutEffect(() => {
		if (tables && tables.length > 0) setSelected([tables[0].id])
	}, [Boolean(tables)])

	return (
		<Layout
			LeftPanel={
				<LeftPanelLayout className="layer" style={{ padding: 8 }}>
					{tables ? (
						<TableList tables={tables} selected={selected} setSelected={setSelected} />
					) : (
						<div>Loading...</div>
					)}
				</LeftPanelLayout>
			}
		>
			<ContentLayout style={{ padding: 8 }}>
				{selected.length > 0 && <TableEditor tableId={selected[0]} />}
			</ContentLayout>
		</Layout>
	)
}

function TableList(props: {
	tables: Table[]
	selected: string[]
	setSelected: (selected: string[]) => void
}) {
	const { tables, selected, setSelected } = props

	const { onClick, onKeyDown } = useListBox({
		list: tables.map((table) => table.id),
		selected,
		setSelected,
		multiselect: true,
	})

	const write = useWrite()

	const handleNewTable = () => {
		const table: Table = { id: randomId() }
		write({ set: [{ key: ["table", table.id], value: table }] })
		setSelected([table.id])
	}

	return (
		<ListBox
			onClick={onClick}
			onKeyDown={onKeyDown}
			style={{ display: "flex", flexDirection: "column", gap: 4 }}
		>
			{tables.map((table) => (
				<ListItem
					key={table.id}
					item={table}
					selected={selected.includes(table.id)}
					style={{ padding: 4, borderRadius: 4 }}
				>
					{table.name || "Untitled"}
				</ListItem>
			))}
			<div>
				<Button onClick={handleNewTable}>New Table</Button>
			</div>
		</ListBox>
	)
}

function TableEditor(props: { tableId: string }) {
	const { tableId } = props

	const { localResult } = useGet(["table", tableId])
	if (localResult.miss) return <div>Loading...</div>
	const table = localResult.hit as Table

	const write = useWrite()
	const setTable = (table: Table) => {
		write({ set: [{ key: ["table", table.id], value: table }] })
	}

	return (
		<div>
			<Input
				value={table.name || ""}
				onChange={(e) => setTable({ ...table, name: e.target.value })}
			/>
			<div>
				{table.properties?.map((property) => (
					<div key={property.id}>{property.name || "Untitled"}</div>
				))}
			</div>
			<NewPropertyButton
				onNewProperty={(type) => {
					const properties = table.properties || []
					const newProperty: Property = {
						id: randomId(),
						type,
						name: capitalize(type.type === "list" ? type.item.type + "s" : type.type),
					}
					setTable({
						...table,
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
