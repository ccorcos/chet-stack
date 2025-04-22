import React, { useState } from "react"
import * as t from "../../../../shared/DataType"
import { Button } from "../Button"
import { ComboBoxSelect } from "../ComboBox"
import { Input } from "../Input"

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
	const [dataType, setDataType] = useState<t.DataType>(t.any)
	return <DataTypeInput dataType={dataType} onChange={setDataType} />
}

function DataTypeInput(props: { dataType: t.DataType; onChange: (dataType: t.DataType) => void }) {
	const { dataType } = props

	return (
		<div>
			<DataTypeTypeInput
				type={dataType.type}
				onChange={(type) => props.onChange(initialTypes[type])}
			/>
			{dataType.type === "literal" && (
				<LiteralDataTypeInput dataType={dataType} onChange={props.onChange} />
			)}
			{dataType.type === "map" && (
				<MapDataTypeInput dataType={dataType} onChange={props.onChange} />
			)}
			{dataType.type === "object" && (
				<ObjectDataTypeInput dataType={dataType} onChange={props.onChange} />
			)}
			{dataType.type === "array" && (
				<ArrayDataTypeInput dataType={dataType} onChange={props.onChange} />
			)}
			{dataType.type === "tuple" && (
				<TupleDataTypeInput dataType={dataType} onChange={props.onChange} />
			)}
			{dataType.type === "or" && <OrDataTypeInput dataType={dataType} onChange={props.onChange} />}
		</div>
	)
}

function DataTypeTypeInput(props: {
	type: t.DataType["type"]
	onChange: (dataType: t.DataType["type"]) => void
}) {
	return (
		<ComboBoxSelect
			items={Object.keys(initialTypes)}
			value={props.type}
			onChange={(type) => props.onChange(type as t.DataType["type"])}
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
		<div>
			{"{[key: string]: "}
			<DataTypeInput
				dataType={dataType.items}
				onChange={(dataType) => props.onChange({ type: "map", items: dataType })}
			/>
			{"}"}
		</div>
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
			<div key={index}>
				<Input
					value={key}
					onChange={(event) => {
						props.onChange({
							type: "object",
							properties: updateKey(key, event.target.value),
							strict: dataType.strict,
						})
					}}
				/>
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
				<Button
					onClick={() => {
						const properties = { ...dataType.properties }
						delete properties[key]
						props.onChange({ type: "object", properties, strict: dataType.strict })
					}}
				>
					Remove
				</Button>
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
		<div>
			{"{"}
			{propertyInputs}
			{draft === undefined ? (
				<Button onClick={() => setDraft("")}>New Property</Button>
			) : (
				<div>
					<Input
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						onBlur={handleNewProperty}
						onKeyDown={(event) => {
							if (event.key === "Enter") handleNewProperty()
						}}
					/>
				</div>
			)}
			{"}"}
			<div>
				Strict:{" "}
				<Input
					type="checkbox"
					checked={dataType.strict}
					onChange={(event) => props.onChange({ ...dataType, strict: event.target.checked })}
				/>
			</div>
		</div>
	)
}

function ArrayDataTypeInput(props: {
	dataType: t.ArrayDataType<t.DataType>
	onChange: (dataType: t.ArrayDataType<t.DataType>) => void
}) {
	const { dataType } = props

	return (
		<div>
			{"["}
			<DataTypeInput
				dataType={dataType.items}
				onChange={(dataType) => props.onChange({ type: "array", items: dataType })}
			/>
			{"]"}
		</div>
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
		<div>
			{"["}
			{dataType.items.map((item, index) => (
				<div key={index}>
					<DataTypeInput dataType={item} onChange={(dataType) => updateItem(index, dataType)} />
					<Button onClick={() => removeItem(index)}>Remove</Button>
				</div>
			))}
			<Button onClick={addItem}>Add Item</Button>
			{"]"}
		</div>
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
		<div>
			{dataType.options.map((option, index) => (
				<div key={index}>
					<DataTypeInput dataType={option} onChange={(dataType) => updateOption(index, dataType)} />
					{index < dataType.options.length - 1 && " | "}
					{dataType.options.length > 2 && (
						<Button onClick={() => removeOption(index)}>Remove</Button>
					)}
				</div>
			))}
			<Button onClick={addOption}>Add Option</Button>
		</div>
	)
}
