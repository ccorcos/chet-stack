import React, { Suspense, useState } from "react"
import { randomId } from "../../../../shared/randomId"
import { passthroughRef } from "../../../helpers/passthroughRef"
import { useGet, useWrite } from "../../../hooks/useDatabase"
import { useInfiniteList } from "../../../hooks/useInfiniteList"
import { usePref } from "../../../hooks/usePref"
import { Subspace } from "../../Subspace"
import { NakedButton } from "../Button"
import { ComboBoxSelect } from "../ComboBox"
import { ContentEditableInput } from "../ContentEditableInput"
import { DataList } from "../DataList"
import { Input, NakedInput } from "../Input"
import { ContentLayout, Layout, LeftPanelLayout } from "../Layout"
import { SelectInput, tokenStyle } from "../MultiSelectInput"
import { Overlay } from "../Overlay"
import { HeaderCell, Table } from "../Table"

type StringPropertyType = { id: string; name?: string; type: "string" }
type NumberPropertyType = { id: string; name?: string; type: "number" }
type BooleanPropertyType = { id: string; name?: string; type: "boolean" }
type SelectPropertyType = { id: string; name?: string; type: "select"; options?: string[] }

type Property = StringPropertyType | NumberPropertyType | BooleanPropertyType | SelectPropertyType
type PropertyType = Property["type"]

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
	// TODO: flatten out
	properties: {
		[propertyId: string]: string | number | boolean | undefined
	}
}

// type StringPropertyType = { id: string; name?: string; type: "string" }
// type NumberPropertyType = { id: string; name?: string; type: "number" }
// type BooleanPropertyType = { id: string; name?: string; type: "boolean" }
// type SelectPropertyType = {
// 	id: string
// 	name?: string
// 	type: "select"
// 	options?: string[]
// 	plural?: boolean
// }

// type Property = StringPropertyType | NumberPropertyType | BooleanPropertyType | SelectPropertyType
// type PropertyValue = undefined | string | number | boolean | string[]
// type PropertyType = Property["type"]

// type Schema = {
// 	id: string
// 	name: string
// 	properties: string[]
// }

// type View = {
// 	id: string
// 	name: string
// 	columns: { property: string; width?: number }[]
// 	order: string[] // preferred record order with no sort.
// 	// filter, sort
// 	// type: "table" | "board" | "calendar" | "list"
// }

// type Record = {
// 	id: string
// 	[property: string]: PropertyValue
// }

const PlantSchema: Schema = {
	id: "schema:plants",
	name: "Plants",
	// TODO: use a record?
	properties: [
		// { id: "id", type: "string" },
		{ id: "name", name: "Name", type: "string" },
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

function PropertyTypeIcon(props: { type: PropertyType } & React.HTMLAttributes<HTMLDivElement>) {
	const { type, ...rest } = props
	const renderer = PropertyRenderers[type]
	if (renderer) return renderer.icon(rest)
	console.warn("Unknown property type", type)
	return <div {...rest}>?</div>
}

function PropertyValue(props: { obj: Record; property: Property }) {
	const { obj, property } = props

	const write = useWrite()
	const update = (value: any) => {
		// TODO: don't change until blur for text inputs?
		write({
			set: [{ key: obj.id, value: JSON.stringify({ ...obj, [property.id]: value }) }],
		})
	}

	let value = obj[property.id]

	if (property.type === "string") {
		if (value === undefined) value = ""
		value = value.toString()
		return (
			<NakedInput
				value={value}
				onChange={(e) => update(e.target.value)}
				style={{ width: "100%" }}
			/>
		)
	}

	if (property.type === "number") {
		if (typeof value === "string") value = parseFloat(value)
		if (typeof value === "boolean") value = value === true ? 1 : 0
		if (value === undefined || isNaN(value)) value = ""
		return (
			<NakedInput
				type="number"
				value={value}
				onChange={(e) => update(e.target.value)}
				style={{ width: "100%" }}
			/>
		)
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

export function TableViewDemo() {
	return (
		<Subspace prefix="TableViewDemo:">
			<Layout
				LeftPanel={
					<LeftPanelLayout show={true}>
						<Suspense fallback={<div>Loading...</div>}>
							<SchemaList />
						</Suspense>
					</LeftPanelLayout>
				}
			>
				<ContentLayout>
					<TableView />
				</ContentLayout>
			</Layout>
		</Subspace>
	)
}

function SchemaList() {
	const schemaListKey = "SchemaList"
	const result = useGet(schemaListKey)
	result.remoteResult.suspend()
	const list: string[] = JSON.parse(result.localResult.hit || "[]")
	const key = schemaListKey
	const onNewItem = () => randomId()

	const write = useWrite()
	const onInsert = () => {
		if (list.length === 0) {
			write({ set: [{ key: key, value: JSON.stringify([onNewItem()]) }] })
		} else {
			write({
				set: [{ key: key, value: JSON.stringify([...list, onNewItem()]) }],
			})
		}
	}

	const onReorder = ({ fromIndex, toIndex }: { fromIndex: number; toIndex: number }) => {
		const newList = list.slice()
		newList.splice(toIndex, 0, newList.splice(fromIndex, 1)[0])
		write({ set: [{ key: key, value: JSON.stringify(newList) }] })
	}

	const onDelete = (x: string) => {
		write({
			set: [
				{
					key: key,
					value: JSON.stringify(list.filter((item) => item !== x)),
				},
			],
		})
	}

	const [selected, setSelected] = useState<string | undefined>(undefined)
	return (
		<DataList
			list={list}
			selected={selected}
			setSelected={setSelected}
			onInsert={onInsert}
			onDelete={onDelete}
			onReorder={onReorder}
		/>
	)
}

function TableView() {
	const [columnWidths, setColumnWidths] = usePref(
		"TableView:columnWidths",
		PlantSchema.properties.map(() => 200)
	)
	const setWidth = (index: number) => (width: number) => {
		const newWidths = [...columnWidths]
		newWidths[index] = width
		setColumnWidths(newWidths)
	}

	const write = useWrite()
	const newRecord = (record: Record) => {
		write({ set: [{ key: record.id, value: JSON.stringify(record) }] })
	}

	const { list, scrollRef, firstRef, lastRef, loadingUp, loadingDown } = useInfiniteList({
		prefix: "",
	})

	const minWidth = 100

	const labelRow = (children: React.ReactNode) => {
		return PlantSchema.properties.map((props, i) => <div key={i}>{i === 0 ? children : ""}</div>)
	}

	return (
		<div style={{ height: "100%", display: "flex", flexDirection: "column", padding: 12 }}>
			<Table
				ref={scrollRef}
				gap={0}
				columnWidths={columnWidths}
				setColumnWidths={setColumnWidths}
				style={{
					paddingRight: 12, // space for scrollbar
				}}
			>
				{PlantSchema.properties.map((prop, index) => {
					return (
						<HeaderCell
							key={prop.id}
							width={columnWidths[index]}
							minWidth={minWidth}
							setWidth={setWidth(index)}
							style={{
								display: "flex",
								alignItems: "center",
								gap: 4,
								borderLeft: index !== 0 ? "1px solid var(--border)" : undefined,
								borderBottom: "1px solid var(--border)",
								padding: "2px 8px",
								backgroundColor: "var(--bg0)",
								// make the resizers above the cells.
								zIndex: PlantSchema.properties.length - index + 10,
							}}
						>
							<div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
								{prop.name}
							</div>
							<PropertyTypeIcon type={prop.type} style={{ flex: 1, textAlign: "right" }} />
						</HeaderCell>
					)
				})}

				{loadingUp && <>{labelRow("Loading...")}</>}
				{!loadingDown && !loadingUp && list.length === 0 && <>{labelRow("No records.")}</>}

				{list.map(({ key, value }, row) => (
					<React.Fragment key={key}>
						{PlantSchema.properties.map((prop, col) => {
							const record = JSON.parse(value)
							return (
								<TableCell
									key={record.id + prop.id}
									ref={
										row === 0 && col === 0
											? firstRef
											: row === list.length - 1 && col === 0
											? lastRef
											: undefined
									}
									style={{
										display: "flex",
										alignItems: "center",
										borderLeft: col !== 0 ? "1px solid var(--border)" : undefined,
										// borderBottom:
										borderBottom: "1px solid var(--border)",
										padding: "2px 8px",
									}}
									record={record}
									property={prop}
								/>
							)
						})}
					</React.Fragment>
				))}
				{loadingDown && <>{labelRow("Loading...")}</>}
			</Table>
			<NakedButton
				style={{
					textAlign: "left",
					padding: "2px 8px",
					borderRadius: 0,
				}}
				onClick={() => newRecord({ id: `record:${randomId()}`, properties: {} })}
			>
				New Record
			</NakedButton>
		</div>
	)
}

const TableCell = passthroughRef(
	(props: {
		ref?: React.RefObject<HTMLDivElement>
		style?: React.CSSProperties
		record: Record
		property: Property
	}) => {
		const { ref, style, record, property } = props

		const renderer = PropertyRenderers[property.type] as PropertyRenderer<Property>

		const [editing, setEditing] = useState<HTMLDivElement | null>(null)
		const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
			if (property.type === "boolean") {
				onUpdate(!record[property.id])
				return
			}
			const elm = e.target as HTMLDivElement
			setEditing(elm)
		}

		const write = useWrite()
		const onUpdate = (value: any) => {
			// TODO: don't change until blur for text inputs?
			// TODO: enter and escape should submit/dismiss
			write({
				set: [{ key: record.id, value: JSON.stringify({ ...record, [property.id]: value }) }],
			})
		}

		const onDismiss = () => {
			setEditing(null)
		}

		return (
			<>
				<div ref={ref} style={style} onClick={onClick}>
					{renderer.view({ record, property })}
				</div>
				{editing && (
					<Overlay anchor={editing} onDismiss={onDismiss}>
						<div
							className="layer"
							style={{
								boxShadow: "var(--shadow)",
								minHeight: "100%",
								...borderPadding(editing),
							}}
						>
							{renderer.edit({ record, property, onUpdate, onDismiss })}
						</div>
					</Overlay>
				)}
			</>
		)
	}
)

function parsePxValue(str: string): number {
	const match = str.match(/(\d+)px/)
	return match ? parseInt(match[1]) : 0
}

function borderPadding(elm: HTMLDivElement): React.CSSProperties {
	const style = window.getComputedStyle(elm)
	return {
		marginLeft: parsePxValue(style.borderLeft),
		marginRight: parsePxValue(style.borderRight),
		marginTop: parsePxValue(style.borderTop),
		marginBottom: parsePxValue(style.borderBottom),
	}
}

const cellInputStyle = {
	width: "100%",
	height: "100%",
	borderRadius: 0,
	borderWidth: 0,
	padding: "2px 8px",
}

const StringPropertyRenderer: PropertyRenderer<StringPropertyType> = {
	icon: (props) => <div {...props}>"</div>,
	parse: (args) => {
		const { record, property } = args
		let value = record[property.id]
		if (value === undefined) return undefined
		value = value.toString()
		return value as string
	},
	view: (args) => {
		return StringPropertyRenderer.parse(args) || ""
	},
	edit: (args) => {
		const value = StringPropertyRenderer.parse(args) || ""
		return (
			<ContentEditableInput
				value={value}
				autoFocus={true}
				style={{
					width: "100%",
					height: "100%",
					borderRadius: 0,
					borderWidth: 0,
					padding: "2px 8px",
				}}
				onSubmit={(value) => args.onUpdate(value)}
				onBlur={() => args.onDismiss()}
			/>
		)
	},
}

const NumberPropertyRenderer: PropertyRenderer<NumberPropertyType> = {
	icon: (props) => <div {...props}>#</div>,
	parse: (args) => {
		const { record, property } = args
		let value = record[property.id]
		if (typeof value === "string") value = parseFloat(value)
		if (typeof value === "boolean") value = value === true ? 1 : 0
		if (value === undefined || isNaN(value)) return undefined
		return value as number
	},
	view: (args) => {
		const value = NumberPropertyRenderer.parse(args)
		if (value === undefined) return ""
		return value.toString()
	},
	edit: (args) => {
		const value = NumberPropertyRenderer.parse(args)
		return (
			<Input
				type="number"
				style={cellInputStyle}
				autoFocus={true}
				value={value || ""}
				onChange={(e) => args.onUpdate(e.target.value)}
			/>
		)
	},
}

const BooleanPropertyRenderer: PropertyRenderer<BooleanPropertyType> = {
	icon: (props) => <div {...props}>✓</div>,
	parse: (args) => {
		const { record, property } = args
		let value = record[property.id]
		if (value === undefined) return false
		if (typeof value === "string") return value.length > 0
		if (typeof value === "number") return value > 0
		return value
	},
	view: (args) => {
		const value = BooleanPropertyRenderer.parse(args)
		return (
			<Input
				type="checkbox"
				checked={value}
				style={{ ...cellInputStyle, pointerEvents: "none", width: "auto" }}
				onChange={() => {}}
			/>
		)
	},
	edit: (args) => {
		throw new Error("This never gets called.")
		const value = BooleanPropertyRenderer.parse(args)
		return (
			<Input
				type="checkbox"
				style={cellInputStyle}
				checked={value}
				onChange={(e) => args.onUpdate(e.target.checked)}
			/>
		)
	},
}

const SelectPropertyRenderer: PropertyRenderer<SelectPropertyType> = {
	icon: (props) => <div {...props}>⏷</div>,
	parse: (args) => {
		const { record, property } = args
		const value = record[property.id]
		if (value === undefined) return undefined
		// NOTE: we can be more forgiving here at some point.
		if (!property.options?.includes(value)) return undefined
		return value as string
	},
	view: (args) => {
		const value = SelectPropertyRenderer.parse(args)
		if (value === undefined) return ""
		return <div style={tokenStyle}>{value}</div>
	},
	edit: (args) => {
		const { property } = args
		const value = SelectPropertyRenderer.parse(args)
		return (
			<SelectInput
				items={property.options || []}
				value={value as any}
				onChange={(value) => {
					args.onUpdate(value)
					args.onDismiss()
				}}
				onDismiss={args.onDismiss}
				autoFocus={true}
			/>
		)
	},
}

type PropertyRenderer<T extends Property> = {
	icon: (props: React.HTMLProps<HTMLDivElement>) => React.ReactNode
	parse: (args: { record: Record; property: T }) => any
	view: (args: { record: Record; property: T }) => React.ReactNode
	edit: (args: {
		record: Record
		property: T
		onUpdate: (value: any) => void
		onDismiss: () => void
	}) => React.ReactNode
}

const PropertyRenderers: {
	[key in PropertyType]: PropertyRenderer<Extract<Property, { type: key }>>
} = {
	string: StringPropertyRenderer,
	number: NumberPropertyRenderer,
	boolean: BooleanPropertyRenderer,
	select: SelectPropertyRenderer,
}

/*

- TokenInput for multi-select and better select UX.
- Save edit on blur instead of while typing.
- Persisted schema editing

- Row selection + reorder rows.
- Cell selection


Notion UX:
- click to edit
- select cells
- select rows


- Cells
	- mousedown -- could be select
	- mouseup -- click to edit
- Header
	- mousedown -- could be re-order
	- mouseup -- click to edit
- Left Header
	- select row
	- re-order row
	- insert row


- edit values
- multi-valued properties. multi-select

- edit schema, dropdown.
	- rename
	- change type
- Add



---

- delete / duplicate rows
- edit the schema
- edit the schema
- row selection
- selection and moving
- edit the schema

*/
