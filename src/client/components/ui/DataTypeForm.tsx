import {
	intersection,
	isArray,
	isBoolean,
	isNumber,
	isPlainObject,
	isString,
	omit,
	uniq,
} from "lodash"
import React, { useMemo, useState } from "react"
import * as t from "../../../shared/DataType"
import { inspect } from "../../../shared/inspect"
import { unreachable } from "../../../shared/typeHelpers"
import { Button } from "./Button"
import { ComboBoxSelect } from "./ComboBox"
import { ContentEditableInput } from "./ContentEditableInput"
import { Input } from "./Input"

const debug = (yes: string, no?: string) => yes

export function DataTypeForm(props: {
	style?: React.CSSProperties
	dataType: t.DataType
	value: any
	onChange: (value: any) => void
}) {
	const { dataType, value, onChange, style } = props

	switch (dataType.type) {
		case "any":
			// Maybe some kind of JSON editor?
			return <div style={{ ...style, padding: "4px 0px" }}>{inspect(value)}</div>

		case "null":
		case "undefined":
			return <div style={{ ...style, padding: "4px 0px" }}>{dataType.type}</div>

		case "literal":
			// This probably doesn't render in most cases.
			return <div style={{ ...style, padding: "4px 0px" }}>{JSON.stringify(dataType.value)}</div>

		case "string": {
			let str = ""
			if (isString(value)) str = value
			if (isNumber(value) || isBoolean(value) || isArray(value)) str = value.toString()
			if (isPlainObject(value)) str = JSON.stringify(value)
			return (
				<div style={style}>
					<ContentEditableInput
						style={{
							border: "1px solid var(--bg2)",
							padding: "4px 8px",
							borderRadius: 4,
							backgroundColor: "var(--bg1)",
							color: "var(--fg0)",
						}}
						value={str}
						onChange={(value) => onChange(value)}
					/>
				</div>
			)
		}
		case "number": {
			let num = 0
			if (isNumber(value)) num = value
			if (isString(value)) num = parseFloat(value)
			return (
				<div style={style}>
					<Input
						type="number"
						value={num}
						onChange={(event) => onChange(parseFloat(event.target.value))}
					/>
				</div>
			)
		}

		case "boolean": {
			const bool = Boolean(value)
			return (
				<div style={{ ...style, padding: "4px 0px" }}>
					<Input
						type="checkbox"
						checked={bool}
						onChange={(event) => onChange(event.target.checked)}
					/>
				</div>
			)
		}

		case "datetime": {
			let datetime = new Date().toISOString()
			try {
				// TODO: better parsing method?
				// TODO: date only or date range.
				datetime = new Date(value).toDateString()
			} catch (error) {}
			return (
				<div style={style}>
					<Input
						type="datetime"
						value={datetime}
						onChange={(event) => onChange(new Date(event.target.value).toISOString())}
					/>
				</div>
			)
		}

		case "dataType":
			return (
				<DataTypeForm
					dataType={t.dataTypeDataType}
					value={dataType}
					onChange={onChange}
					style={style}
				/>
			)

		case "array": {
			let items: any[] = []
			if (isArray(value)) items = value
			else if (isString(value)) items = value.split(",").map((str) => str.trim())
			else if (value !== undefined && value !== null) items.push(value)

			return (
				<div style={style}>
					<span>{" ["}</span>
					{items.map((item, index) => (
						<div style={{ display: "flex", alignItems: "flex-start" }}>
							<DataTypeForm
								dataType={dataType.items}
								value={item}
								onChange={(newItem) => {
									onChange(items.map((x, i) => (i === index ? newItem : x)))
								}}
							/>
							<Button
								onClick={() => {
									onChange(items.filter((x, i) => i !== index))
								}}
							>
								Delete
							</Button>
						</div>
					))}
					<Button
						onClick={() => {
							console.log("NEW")
							onChange([...items, undefined])
						}}
					>
						New Item
					</Button>
					<span>{"]"}</span>
				</div>
			)
		}

		case "tuple": {
			let tup: any[] = []
			if (isArray(value)) tup = value
			else if (value !== null && value !== undefined) tup = [value]

			return (
				<div style={{ display: "flex", alignItems: "flex-start", ...style }}>
					<span>{"["}</span>
					{dataType.items.map((itemDataType, index) => {
						const itemValue = tup[index]
						return (
							<DataTypeForm
								dataType={itemDataType}
								value={itemValue}
								onChange={(newValue) => {
									const newTup = [...tup]
									newTup[index] = newValue
									onChange(newTup)
								}}
							/>
						)
					})}
					<span>{"]"}</span>
				</div>
			)
		}

		case "map": {
			let obj = {}
			if (isPlainObject(value)) obj = value
			return (
				<div style={style}>
					{Object.entries(obj).map(([key, value]) => (
						<div style={{ display: "flex", alignItems: "flex-start" }}>
							<ContentEditableInput
								style={{
									border: "1px solid var(--bg2)",
									padding: "4px 8px",
									borderRadius: 4,
									backgroundColor: "var(--bg1)",
									color: "var(--fg0)",
								}}
								value={key}
								onChange={(newKey) => {
									const newObj = Object.fromEntries(
										Object.entries(obj).map(([k, v]) => (k === key ? [newKey, v] : [k, v]))
									)
									onChange(newObj)
								}}
							/>
							<span>:</span>
							<DataTypeForm
								dataType={dataType.items}
								value={value}
								onChange={(newItem) => {
									const newObj = Object.fromEntries(
										Object.entries(obj).map(([k, v]) => (k === key ? [k, newItem] : [k, v]))
									)
									onChange(newObj)
								}}
							/>
							<Button
								onClick={() => {
									const newObj = Object.fromEntries(
										Object.entries(obj).filter(([k, v]) => k !== key)
									)
									onChange(newObj)
								}}
							>
								Delete
							</Button>
							{/* TODO: reorder */}
						</div>
					))}
					<Button
						onClick={() => {
							const newObj = Object.fromEntries([...Object.entries(obj), ["", undefined]])
							onChange(newObj)
						}}
					>
						New Item
					</Button>
				</div>
			)
		}

		case "object": {
			let obj = {}
			if (isPlainObject(value)) obj = value
			const entries = Object.entries(dataType.properties)
			if (entries.length === 0) return false
			return (
				<div style={{ display: "flex", flexDirection: "column", color: debug("red"), ...style }}>
					{entries.map(([key, valueDataType]) => {
						const dt = valueDataType.type === "optional" ? valueDataType.value : valueDataType
						return (
							<div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
								<div style={{ padding: "4px 0px" }}>{key}:</div>
								<DataTypeForm
									dataType={dt}
									value={value?.[key]}
									onChange={(newValue) => {
										const newObj = { ...obj }
										newObj[key] = newValue
										onChange(newObj)
									}}
								/>
							</div>
						)
					})}
				</div>
			)
		}

		case "or": {
			return <OrDataTypeForm dataType={dataType} value={value} onChange={onChange} style={style} />
		}

		default:
			throw unreachable(dataType)
	}
}

function OrDataTypeForm(props: {
	style?: React.CSSProperties
	dataType: t.OrDataType
	value: any
	onChange: (newValue: any) => void
}) {
	const { dataType, value, onChange, style } = props

	if (dataType.options.length === 0) {
		// We should probably avoid this ever happening.
		return false
	}

	if (dataType.options.length === 1) {
		// Trivial case: or(number)
		return (
			<DataTypeForm
				dataType={dataType.options[0]}
				value={value}
				onChange={onChange}
				style={style}
			/>
		)
	}

	// Lets try to discriminate the different options.
	const types = uniq(dataType.options.map((opt) => opt.type))

	if (types.length === dataType.options.length) {
		// If all the options are different types, then present a type selector.
		return <OrPrimativeTypePicker {...props} />
	}

	if (types.length === 1) {
		// If all the options are the same type, then we need to try to discriminate further.
		const type = types[0]

		switch (type) {
			case "string":
			case "number":
			case "boolean":
			case "undefined":
			case "null":
			case "datetime":
			case "any":
			case "dataType": {
				// Trivial case, e.g. or(number, number) -> number
				return (
					<DataTypeForm
						dataType={dataType.options[0]}
						value={value}
						onChange={onChange}
						style={style}
					/>
				)
			}

			case "or": {
				// Trivial case, e.g. or(or(...), or(...)) -> or(..., ...)
				const options = dataType.options as t.OrDataType[]
				const allOptions = options.flatMap((opt) => opt.options)
				return (
					<DataTypeForm
						dataType={{ type: "or", options: allOptions }}
						value={value}
						onChange={onChange}
						style={style}
					/>
				)
			}

			case "literal": {
				// Select a literal option.
				const options = dataType.options as t.LiteralDataType[]
				return (
					<div style={style}>
						<ComboBoxSelect
							items={options.map((opt) => JSON.stringify(opt))}
							value={JSON.stringify(value)}
							onChange={(newOption) => onChange(JSON.parse(newOption))}
						/>
					</div>
				)
			}

			case "object": {
				return (
					<div style={style}>
						<OrObjectPicker
							dataType={dataType as t.OrDataType<t.ObjectDataType>}
							value={value}
							onChange={onChange}
						/>
					</div>
				)
			}

			case "tuple":
			case "map":
			case "array": {
				return (
					<div style={style}>
						<OrGeneralPicker
							dataType={dataType as t.OrDataType<t.ArrayDataType>}
							value={value}
							onChange={onChange}
						/>
					</div>
				)
			}
			default: {
				throw unreachable(type)
			}
		}
	}

	// Complicated case where some types are the same and some arent.
	return (
		<div style={style}>
			<OrGeneralPicker
				dataType={dataType as t.OrDataType<t.ArrayDataType>}
				value={value}
				onChange={onChange}
			/>
		</div>
	)
}

function OrPrimativeTypePicker(props: {
	style?: React.CSSProperties
	dataType: t.OrDataType
	value: any
	onChange: (newValue: any) => void
}) {
	const { dataType, value, onChange, style } = props
	const types = dataType.options.map((opt) => opt.type)

	const initialType = useMemo(() => {
		const validOpt = dataType.options.find((opt) => t.is(opt, value))
		if (validOpt) return validOpt.type
		return types[0]
	}, [])

	const [type, setType] = useState(initialType)
	const currentDataType = dataType.options.find((opt) => opt.type === type)!

	return (
		<div style={{ ...style, display: "flex", flexDirection: "column", gap: 8 }}>
			<ComboBoxSelect items={types} value={type} onChange={setType} />
			<DataTypeForm dataType={currentDataType} value={value} onChange={onChange} />
		</div>
	)
}

function OrObjectLiteralPicker(props: {
	property: string
	dataType: t.OrDataType<t.ObjectDataType>
	value: any
	onChange: (newValue: any) => void
}) {
	const { dataType, value, onChange, property } = props

	const initialType = useMemo(() => {
		const validOpt = dataType.options.find((opt) => {
			const partial = t.object({ [property]: opt.properties[property] }, false)
			return t.is(partial, value)
		})
		if (validOpt) return validOpt
		return dataType.options[0]
	}, [])

	const [type, setType] = useState(initialType)

	const literalValue = (dt: t.ObjectDataType) =>
		JSON.stringify((dt.properties[property] as t.LiteralDataType).value)

	// Ignore the property we're already selecting.
	const formType: t.ObjectDataType = { ...type, properties: omit(type.properties, [property]) }

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<div style={{ display: "flex", alignItems: "flex-start", gap: 8, color: debug("blue") }}>
				<div style={{ padding: "4px 0px" }}>{property}:</div>
				<ComboBoxSelect
					items={dataType.options.map(literalValue)}
					value={literalValue(type)}
					onChange={(newValue) =>
						setType(dataType.options.find((opt) => literalValue(opt) === newValue)!)
					}
				/>
			</div>
			<DataTypeForm
				dataType={formType}
				value={value}
				onChange={onChange}
				// style={{ marginLeft: 12 }}
			/>
		</div>
	)
}

function OrObjectPicker(props: {
	dataType: t.OrDataType<t.ObjectDataType>
	value: any
	onChange: (newValue: any) => void
}) {
	const { dataType } = props

	const keys = dataType.options.map((opt) => Object.keys(opt.properties))
	const sharedKeys = intersection(...keys)

	if (sharedKeys.length === 0) {
		return <OrGeneralPicker {...props} />
	}

	// Find which sharedKeys discriminate best.
	// Prefer a literal property with different values.
	const literalKey = sharedKeys.find((key) => {
		const options = dataType.options.map((opt) => opt.properties[key])
		if (!options.every((opt) => opt.type === "literal")) return false
		const values = uniq((options as t.LiteralDataType[]).map((opt) => opt.value))
		return values.length === dataType.options.length
	})

	if (literalKey) return <OrObjectLiteralPicker {...props} property={literalKey} />

	// TODO: Find a property where they're all different types, e.g. or(object({a: number}), object({a: string}))
	// TODO: Find a property that itself discriminates well, e.g. or(object({a: array(string)}), object({b: array(number)}))
	// This is almost an endless set of options (tuples, nested objects) so let's punt for now.
	return <OrGeneralPicker {...props} />
}

function OrGeneralPicker(props: {
	dataType: t.OrDataType
	value: any
	onChange: (newValue: any) => void
}) {
	const { dataType, value, onChange } = props

	const initialType = useMemo(() => {
		const validOpt = dataType.options.find((opt) => t.is(opt, value))
		if (validOpt) return validOpt
		return dataType.options[0]
	}, [])

	const [type, setType] = useState(initialType)

	return (
		<>
			<ComboBoxSelect
				items={dataType.options.map((opt) => t.inspect(opt))}
				value={t.inspect(type)}
				onChange={(newValue) =>
					setType(dataType.options.find((opt) => t.inspect(opt) === newValue)!)
				}
			/>
			<DataTypeForm dataType={type} value={value} onChange={onChange} />
		</>
	)
}
