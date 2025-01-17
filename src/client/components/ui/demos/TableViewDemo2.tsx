import React, { useState } from "react"
import { randomId } from "../../../../shared/randomId"
import { passthroughRef } from "../../../helpers/passthroughRef"
import { useWrite } from "../../../hooks/useDatabase"
import { useInfiniteList } from "../../../hooks/useInfiniteList"
import { usePref } from "../../../hooks/usePref"
import { Subspace } from "../../Subspace"
import { NakedButton } from "../Button"
import { ComboBoxSelect } from "../ComboBox"
import { NakedInput } from "../Input"
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

export function TableViewDemo2() {
	return (
		<Subspace prefix="TableViewDemo:">
			<TableView />
		</Subspace>
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
								borderLeft: index !== 0 ? "1px solid var(--separator)" : undefined,
								borderBottom: "1px solid var(--separator)",
								padding: "2px 8px",
								backgroundColor: "var(--background)",
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
										borderLeft: col !== 0 ? "1px solid var(--separator)" : undefined,
										// borderBottom:
										// 	row !== list.length - 1 ? "1px solid var(--separator)" : undefined,
										borderBottom: "1px solid var(--separator)",
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
					// borderTop: "1px solid var(--separator)",
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

// TODO:
// - autofocus input so and save the result
// - checkbox should just click
// - dropdown view more similar to Notion
// - cell selection
// - persist schema
// ---
// - row selection
// - column reorder
// - row reorder

const TableCell = passthroughRef(
	(props: {
		ref?: React.RefObject<HTMLDivElement>
		style?: React.CSSProperties
		record: Record
		property: Property
	}) => {
		const { ref, style, record, property } = props

		const [editing, setEditing] = useState<HTMLDivElement | null>(null)
		const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
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
		return (
			<>
				<div ref={ref} style={style} onClick={onClick}>
					{PropertyRenderers[property.type].view(record, property as any)}
				</div>
				{editing && (
					<Overlay anchor={editing} onDismiss={() => setEditing(null)}>
						<div
							style={{
								background: "var(--popup-background)",
								boxShadow: "var(--shadow)",
								borderRadius: 4,
							}}
						>
							{PropertyRenderers[property.type].edit(record, property as any, onUpdate)}
						</div>
					</Overlay>
				)}
			</>
		)
	}
)

type DivProps = React.HTMLAttributes<HTMLDivElement>

const StringPropertyRenderer = {
	icon: (props: DivProps) => <div {...props}>"</div>,
	parse: (obj: Record, property: StringPropertyType) => {
		let value = obj[property.id]
		if (value === undefined) return undefined
		value = value.toString()
		return value as string
	},
	view: (obj: Record, property: StringPropertyType) => {
		return StringPropertyRenderer.parse(obj, property) || ""
	},
	edit: (obj: Record, property: StringPropertyType, onUpdate: (value: string) => void) => {
		const value = StringPropertyRenderer.parse(obj, property) || ""
		return (
			<NakedInput
				value={value}
				onChange={(e) => onUpdate(e.target.value)}
				style={{ width: "100%" }}
			/>
		)
	},
}

const NumberPropertyRenderer = {
	icon: (props: DivProps) => <div {...props}>#</div>,
	parse: (obj: Record, property: NumberPropertyType) => {
		let value = obj[property.id]
		if (typeof value === "string") value = parseFloat(value)
		if (typeof value === "boolean") value = value === true ? 1 : 0
		if (value === undefined || isNaN(value)) return undefined
		return value as number
	},
	view(obj: Record, property: NumberPropertyType) {
		const value = NumberPropertyRenderer.parse(obj, property)
		if (value === undefined) return ""
		return value.toString()
	},
	edit: (obj: Record, property: NumberPropertyType, onUpdate: (value: string) => void) => {
		const value = NumberPropertyRenderer.parse(obj, property)
		return (
			<NakedInput
				type="number"
				value={value}
				onChange={(e) => onUpdate(e.target.value)}
				style={{ width: "100%" }}
			/>
		)
	},
}

const BooleanPropertyRenderer = {
	icon: (props: DivProps) => <div {...props}>✓</div>,
	parse: (obj: Record, property: BooleanPropertyType) => {
		let value = obj[property.id]
		if (value === undefined) return false
		if (typeof value === "string") return value.length > 0
		if (typeof value === "number") return value > 0
		return value
	},
	view: (obj: Record, property: BooleanPropertyType) => {
		const value = BooleanPropertyRenderer.parse(obj, property)
		return (
			<NakedInput
				type="checkbox"
				checked={value}
				style={{ pointerEvents: "none" }}
				onChange={() => {}}
			/>
		)
	},
	edit: (obj: Record, property: BooleanPropertyType, onUpdate: (value: boolean) => void) => {
		const value = BooleanPropertyRenderer.parse(obj, property)
		return (
			<NakedInput type="checkbox" checked={value} onChange={(e) => onUpdate(e.target.checked)} />
		)
	},
}

const SelectPropertyRenderer = {
	icon: (props: DivProps) => <div {...props}>⏷</div>,
	parse: (obj: Record, property: SelectPropertyType) => {
		const value = obj[property.id]
		if (value === undefined) return undefined
		// NOTE: we can be more forgiving here at some point.
		if (!property.options?.includes(value)) return undefined
		return value as string
	},
	view: (obj: Record, property: SelectPropertyType) => {
		const value = SelectPropertyRenderer.parse(obj, property)
		if (value === undefined) return ""
		return value
	},
	edit: (obj: Record, property: SelectPropertyType, onUpdate: (value: string) => void) => {
		const value = SelectPropertyRenderer.parse(obj, property)
		return (
			<ComboBoxSelect
				items={property.options || []}
				placeholder="Select"
				value={value as any}
				onChange={onUpdate}
				Button={NakedButton}
			/>
		)
	},
}

const PropertyRenderers = {
	string: StringPropertyRenderer,
	number: NumberPropertyRenderer,
	boolean: BooleanPropertyRenderer,
	select: SelectPropertyRenderer,
}

/*

TODO:

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
