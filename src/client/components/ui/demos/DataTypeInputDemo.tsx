import React, { useState } from "react"
import * as t from "../../../../shared/DataType"
import { Button } from "../Button"
import { ComboBoxSelect } from "../ComboBox"
import { Input } from "../Input"
import { DataTypeForm } from "./DataTypeFormDemo"

const initialTypes: { [T in t.DataType["type"]]: Extract<t.DataType, { type: T }> } = {
	any: t.any,
	null: t.null_,
	undefined: t.undefined_,

	string: t.string,
	number: t.number,
	boolean: t.boolean,
	datetime: t.datetime,
	dataType: t.dataType,

	literal: t.literal(""),

	map: t.map(t.string),
	object: t.object({}),
	array: t.array(t.string),

	tuple: t.tuple(t.any),
	or: t.or(t.any, t.any),
}

export function DataTypeInputDemo() {
	const [dataType, setDataType] = useState<t.DataType>(
		t.object({
			string: t.string,
			literal: t.optional(t.literal("hello")),
			map: t.map(t.number),
			array: t.array(
				t.object({
					nested: t.tuple(t.string, t.or(t.number, t.object({ id: t.string }))),
				})
			),
		})
	)
	return (
		<div style={{ padding: 8, display: "flex", flexDirection: "row", gap: 8 }}>
			<DataTypeForm dataType={t.dataTypeDataType} value={dataType} onChange={setDataType} />
		</div>
	)
	// return (
	// 	<div style={{ padding: 8, display: "flex", flexDirection: "row", gap: 8 }}>
	// 		<DataTypeInput dataType={dataType} onChange={setDataType} />
	// 		<div style={{ whiteSpace: "pre", fontSize: 12 }}>{JSON.stringify(dataType, null, 2)}</div>
	// 	</div>
	// )
}

function DataTypeInput(props: { dataType: t.DataType; onChange: (dataType: t.DataType) => void }) {
	const { dataType } = props

	const extra = (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 8,
				paddingLeft: 8,
				marginLeft: 7,
				borderLeft: "1px solid var(--border)",
			}}
		>
			{dataType.type === "object" && (
				<ObjectDataTypeInput dataType={dataType} onChange={props.onChange} />
			)}

			{dataType.type === "tuple" && (
				<TupleDataTypeInput dataType={dataType} onChange={props.onChange} />
			)}
			{dataType.type === "or" && <OrDataTypeInput dataType={dataType} onChange={props.onChange} />}
		</div>
	)

	const hasExtra = extra.props.children.filter(Boolean).length > 0

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<div style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
				<DataTypeTypeInput
					value={dataType.type}
					onChange={(type) => props.onChange(initialTypes[type])}
				/>
				{dataType.type === "literal" && (
					<LiteralDataTypeInput dataType={dataType} onChange={props.onChange} />
				)}
				{dataType.type === "map" && (
					<MapDataTypeInput dataType={dataType} onChange={props.onChange} />
				)}
				{dataType.type === "array" && (
					<ArrayDataTypeInput dataType={dataType} onChange={props.onChange} />
				)}
			</div>
			{hasExtra && extra}
		</div>
	)
}

function DataTypeTypeInput(props: {
	value: t.DataType["type"]
	onChange: (dataType: t.DataType["type"]) => void
}) {
	return (
		<ComboBoxSelect
			style={{ width: 110 }}
			items={Object.keys(initialTypes)}
			value={props.value}
			onChange={(newType) => props.onChange(newType as t.DataType["type"])}
			placeholder="Select type..."
		/>
	)
}

function LiteralDataTypeInput(props: {
	dataType: t.LiteralDataType<any>
	onChange: (dataType: t.LiteralDataType<any>) => void
}) {
	const { dataType } = props

	return (
		<>
			<ComboBoxSelect
				style={{ width: 110 }}
				items={["string", "number", "boolean"]}
				value={typeof dataType.value}
				onChange={(type) => {
					if (typeof dataType.value === type) return
					props.onChange({ type: "literal", value: { number: 0, string: "", boolean: true }[type] })
				}}
				placeholder="Select type..."
			/>
			{typeof dataType.value === "string" && (
				<Input
					value={dataType.value}
					onChange={(event) => props.onChange({ type: "literal", value: event.target.value })}
				/>
			)}
			{typeof dataType.value === "number" && (
				<Input
					type="number"
					value={dataType.value || 0}
					onChange={(event) => {
						console.log(event.target.value)
						let n = 0
						try {
							n = parseFloat(event.target.value)
						} catch (error) {
							// dont worry about it
						}
						props.onChange({ type: "literal", value: n })
					}}
				/>
			)}
			{typeof dataType.value === "boolean" && (
				<Input
					type="checkbox"
					checked={dataType.value}
					onChange={(event) => props.onChange({ type: "literal", value: event.target.checked })}
				/>
			)}
		</>
	)
}

function MapDataTypeInput(props: {
	dataType: t.MapDataType<any>
	onChange: (dataType: t.MapDataType<any>) => void
}) {
	const { dataType } = props

	return (
		<DataTypeInput
			dataType={dataType.items}
			onChange={(dataType) => props.onChange({ type: "map", items: dataType })}
		/>
	)
}

function ObjectDataTypeInput(props: {
	dataType: t.ObjectDataType<{ [key: string]: t.DataType | t.Optional<t.DataType> }>
	onChange: (
		dataType: t.ObjectDataType<{ [key: string]: t.DataType | t.Optional<t.DataType> }>
	) => void
}) {
	const { dataType } = props

	function updateValue(key: string, newDataType: t.DataType | t.Optional<t.DataType>) {
		// Try to preserve the object key order.
		const properties: { [key: string]: t.DataType | t.Optional<t.DataType> } = {}
		for (const [k, v] of Object.entries(dataType.properties)) {
			if (k === key) properties[key] = newDataType
			else properties[k] = v
		}
		return properties
	}

	function updateKey(oldKey: string, newKey: string) {
		// Try to preserve the object key order.
		const properties: { [key: string]: t.DataType | t.Optional<t.DataType> } = {}
		for (const [k, v] of Object.entries(dataType.properties)) {
			if (k === oldKey) properties[newKey] = v
			else properties[k] = v
		}
		return properties
	}

	const propertyInputs = Object.entries(dataType.properties).map(([key, value], index) => {
		return (
			<div
				key={index}
				style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "flex-start" }}
			>
				<Button
					onClick={() => {
						const properties = { ...dataType.properties }
						delete properties[key]
						props.onChange({ type: "object", properties, strict: dataType.strict })
					}}
				>
					X
				</Button>
				<Input
					value={key}
					style={{ width: 160, alignSelf: "flex-start" }}
					onChange={(event) => {
						props.onChange({
							type: "object",
							properties: updateKey(key, event.target.value),
							strict: dataType.strict,
						})
					}}
				/>
				<Input
					type="checkbox"
					checked={value.type === "optional"}
					onChange={(event) => {
						const optional = event.target.checked
						if (optional && value.type !== "optional") {
							props.onChange({
								type: "object",
								properties: updateValue(key, t.optional(value)),
								strict: dataType.strict,
							})
						} else if (!optional && value.type === "optional") {
							props.onChange({
								type: "object",
								properties: updateValue(key, value.value),
								strict: dataType.strict,
							})
						}
					}}
				/>
				<div style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
					<DataTypeInput
						dataType={value.type === "optional" ? value.value : value}
						onChange={(newDataType) => {
							if (value.type === "optional") {
								props.onChange({
									type: "object",
									properties: updateValue(key, t.optional(newDataType)),
									strict: dataType.strict,
								})
							} else {
								props.onChange({
									type: "object",
									properties: updateValue(key, newDataType),
									strict: dataType.strict,
								})
							}
						}}
					/>
				</div>
			</div>
		)
	})

	const [draft, setDraft] = useState<string | undefined>(undefined)
	const handleNewProperty = () => {
		if (draft === undefined) return
		props.onChange({
			type: "object",
			properties: { ...dataType.properties, [draft]: t.any },
			strict: dataType.strict,
		})
		setDraft(undefined)
	}

	return (
		<>
			{propertyInputs}
			<div>
				{draft === undefined ? (
					<Button onClick={() => setDraft("")}>New Property</Button>
				) : (
					<div>
						<Input
							style={{ width: 160 }}
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							onBlur={handleNewProperty}
							onKeyDown={(event) => {
								if (event.key === "Enter") handleNewProperty()
							}}
						/>
					</div>
				)}
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					gap: 8,
					alignItems: "center",
				}}
			>
				<div>Strict:</div>
				<Input
					type="checkbox"
					checked={dataType.strict}
					onChange={(event) => props.onChange({ ...dataType, strict: event.target.checked })}
				/>
			</div>
		</>
	)
}

function ArrayDataTypeInput(props: {
	dataType: t.ArrayDataType<t.DataType>
	onChange: (dataType: t.ArrayDataType<t.DataType>) => void
}) {
	const { dataType } = props

	return (
		<DataTypeInput
			dataType={dataType.items}
			onChange={(dataType) => props.onChange({ type: "array", items: dataType })}
		/>
	)
}

function TupleDataTypeInput(props: {
	dataType: t.TupleDataType<t.DataType[]>
	onChange: (dataType: t.TupleDataType<t.DataType[]>) => void
}) {
	const { dataType } = props

	const addItem = () => {
		props.onChange({ type: "tuple", items: [...dataType.items, t.any] })
	}

	const removeItem = (index: number) => {
		const newItems = [...dataType.items]
		newItems.splice(index, 1)
		props.onChange({ type: "tuple", items: newItems })
	}

	const updateItem = (index: number, item: t.DataType) => {
		const newItems = [...dataType.items]
		newItems[index] = item
		props.onChange({ type: "tuple", items: newItems })
	}

	return (
		<>
			{dataType.items.map((item, index) => (
				<div
					key={index}
					style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "flex-start" }}
				>
					<Button onClick={() => removeItem(index)}>x</Button>
					<DataTypeInput dataType={item} onChange={(dataType) => updateItem(index, dataType)} />
				</div>
			))}
			<div>
				<Button onClick={addItem}>Add Item</Button>
			</div>
		</>
	)
}

function OrDataTypeInput(props: {
	dataType: t.OrDataType<t.DataType>
	onChange: (dataType: t.OrDataType<t.DataType>) => void
}) {
	const { dataType } = props

	const addOption = () => {
		props.onChange({ type: "or", options: [...dataType.options, t.any] })
	}

	const removeOption = (index: number) => {
		if (dataType.options.length <= 2) return // Keep at least 2 options
		const newOptions = [...dataType.options]
		newOptions.splice(index, 1)
		props.onChange({ type: "or", options: newOptions })
	}

	const updateOption = (index: number, option: t.DataType) => {
		const newOptions = [...dataType.options]
		newOptions[index] = option
		props.onChange({ type: "or", options: newOptions })
	}

	return (
		<>
			{dataType.options.map((option, index) => (
				<div
					key={index}
					style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "flex-start" }}
				>
					{dataType.options.length > 2 && <Button onClick={() => removeOption(index)}>x</Button>}
					<DataTypeInput dataType={option} onChange={(dataType) => updateOption(index, dataType)} />
				</div>
			))}
			<div>
				<Button onClick={addOption}>Add Option</Button>
			</div>
		</>
	)
}
