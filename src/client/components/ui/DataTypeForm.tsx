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
import React from "react"
import * as t from "../../../shared/DataType"
import { inspect } from "../../../shared/inspect"
import { unreachable } from "../../../shared/typeHelpers"
import { Button, hPadding, vPadding } from "./Button"
import { ComboBoxSelect } from "./ComboBox"
import { ContentEditableInput } from "./ContentEditableInput"
import { Input } from "./Input"

const debug = (yes: string, no?: string) => yes

export function DataTypeForm(props: {
	style?: React.CSSProperties
	dataType: t.DataType
	value: any
	onChange: (value: any) => void

	layer?: boolean
	gridChildren?: React.ReactNode
}) {
	const { dataType, value, onChange, style } = props

	const className = props.layer ? "layer" : ""

	switch (dataType.type) {
		case "any":
			// Maybe some kind of JSON editor?
			return <div style={{ ...style, padding: `${vPadding}px 0px` }}>{inspect(value)}</div>

		case "null":
		case "undefined":
			return <div style={{ ...style, padding: `${vPadding}px 0px` }}>{dataType.type}</div>

		case "literal":
			// This probably doesn't render in most cases.
			return (
				<div style={{ ...style, padding: `${vPadding}px 0px` }}>
					{JSON.stringify(dataType.value)}
				</div>
			)

		case "string": {
			let str = ""
			if (isString(value)) str = value
			if (isNumber(value) || isBoolean(value) || isArray(value)) str = value.toString()
			if (isPlainObject(value)) str = JSON.stringify(value)

			// TODO: this doesnt update when value changes.
			return (
				<div style={style}>
					<ContentEditableInput
						style={{
							minWidth: 100,
							border: "1px solid var(--bg2)",
							padding: `${vPadding}px ${hPadding}px`,
							borderRadius: 4,
							backgroundColor: "var(--bg1)",
							color: "var(--fg0)",
						}}
						value={str}
						onChange={onChange}
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
				<div style={{ ...style, padding: `${vPadding}px 0px` }}>
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

		case "dataType": {
			// Similar to OrPrimitiveDataType
			// TODO: special case here for ObjectDataType so it looks better but it should still work!

			const getType = (dt: t.DataType) => {
				return (dt as t.ObjectDataType<{ type: t.LiteralDataType }>).properties.type.value as string
			}

			const types = t.dataTypeDataType.options.map((obj) => getType(obj))

			const validOpt = t.dataTypeDataType.options.find((opt) => t.is(opt, value))
			const type = validOpt ? getType(validOpt) : types[0]
			const currentDataType = t.dataTypeDataType.options.find(
				(obj) => getType(obj) === type
			)! as t.ObjectDataType

			return (
				<div
					className={className}
					style={{ ...style, display: "flex", flexDirection: "column", gap: 8 }}
				>
					<DataTypeForm
						dataType={omit(currentDataType, ["properties.type"]) as t.DataType}
						value={value}
						onChange={onChange}
						gridChildren={
							<>
								<div style={{ padding: `${vPadding}px 0px` }}>type:</div>
								<ComboBoxSelect
									style={{ width: "fit-content" }}
									items={types}
									value={type}
									onChange={(newType) => {
										const newDataType = t.dataTypeDataType.options.find(
											(obj) => getType(obj) === newType
										)!
										onChange(t.coerce(newDataType, value))
									}}
								/>
							</>
						}
					/>
				</div>
			)

			// return (
			// 	<DataTypeForm
			// 		dataType={t.dataTypeDataType}
			// 		value={value}
			// 		onChange={onChange}
			// 		style={style}
			// 	/>
			// )
		}

		case "array": {
			return <ArrayForm {...props} dataType={dataType as t.ArrayDataType} />
		}

		case "map": {
			return <MapForm {...props} dataType={dataType as t.MapDataType} />
		}

		case "tuple": {
			let tup: any[] = []
			if (isArray(value)) tup = value
			else if (value !== null && value !== undefined) tup = [value]

			return (
				<div
					className={className}
					style={{
						display: "flex",
						alignItems: "flex-start",
						...style,
						...(props.layer && {
							margin: -2,
							padding: 2,
							borderRadius: 4,
						}),
					}}
				>
					<span style={{ marginRight: 4, paddingTop: vPadding }}>{"["}</span>
					{dataType.items.map((itemDataType, index) => {
						const itemValue = tup[index]
						return (
							<>
								{index > 0 && <span style={{ marginRight: 4, paddingTop: vPadding }}>,</span>}
								<DataTypeForm
									dataType={itemDataType}
									value={itemValue}
									onChange={(newValue) => {
										const newTup = [...tup]
										newTup[index] = newValue
										onChange(newTup)
									}}
									layer={true}
								/>
							</>
						)
					})}
					<span style={{ marginLeft: 4, paddingTop: vPadding }}>{"]"}</span>
				</div>
			)
		}

		case "object": {
			let obj = {}
			if (isPlainObject(value)) obj = value
			const entries = Object.entries(dataType.properties)

			return (
				<div
					className={className}
					style={{
						display: "grid",
						height: "fit-content",
						width: "fit-content",
						gridTemplateColumns: "auto 1fr",
						gap: 8,
						alignItems: "flex-start",
						color: debug("red"),
						...style,
						...(props.layer && {
							margin: -2,
							padding: 2,
							borderRadius: 4,
						}),
					}}
				>
					{props.gridChildren}
					{entries.map(([key, valueDataType]) => {
						// TODO: add ability for this to be optional.
						const dt = valueDataType.type === "optional" ? valueDataType.value : valueDataType
						return (
							<>
								<div style={{ padding: `${vPadding}px 0px` }}>{key}:</div>
								<DataTypeForm
									dataType={dt}
									value={value?.[key]}
									onChange={(newValue) => {
										const newObj = { ...obj }
										newObj[key] = newValue
										onChange(newObj)
									}}
									style={{ width: "fit-content" }}
									layer={true}
								/>
							</>
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

function ArrayForm(props: {
	style?: React.CSSProperties
	dataType: t.ArrayDataType
	value: any
	onChange: (value: any) => void
	layer?: boolean
}) {
	const { dataType, value, onChange, style } = props

	const array = t.coerce(dataType, value)
	const className = props.layer ? "layer" : ""

	return (
		<div
			className={className}
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 8,
				alignItems: "flex-start",
				...style,
				...(props.layer && {
					margin: -2,
					padding: 2,
					borderRadius: 4,
				}),
			}}
		>
			{array.map((item, index) => (
				<div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
					<DataTypeForm
						dataType={dataType.items}
						value={item}
						onChange={(newItem) => {
							onChange(array.map((oldItem, i) => (i === index ? newItem : oldItem)))
						}}
						layer={true}
					/>
					<Button
						onClick={() => {
							onChange(array.filter((x, i) => i !== index))
						}}
					>
						Delete
					</Button>
				</div>
			))}
			<Button
				onClick={() => {
					onChange([...array, t.coerce(dataType.items, undefined)])
				}}
			>
				New Item
			</Button>
		</div>
	)
}

function MapForm(props: {
	style?: React.CSSProperties
	dataType: t.MapDataType
	value: any
	onChange: (value: any) => void
	layer?: boolean
}) {
	const { dataType, value, onChange, style } = props
	let obj = {}
	if (isPlainObject(value)) obj = value

	const className = props.layer ? "layer" : ""
	const entries = Object.entries(obj)
	return (
		<div
			className={className}
			style={{
				...style,
				display: "grid",
				height: "fit-content",
				width: "fit-content",
				gridTemplateColumns: "repeat(4, auto)",
				gridTemplateRows: `repeat(${entries.length}, auto) auto`,
				gap: 8,
				alignItems: "flex-start",
				...(props.layer && {
					margin: -2,
					padding: 2,
					borderRadius: 4,
				}),
			}}
		>
			{entries.map(([key, value]) => (
				<>
					<ContentEditableInput
						style={{
							border: "1px solid var(--bg2)",
							padding: `${vPadding}px ${hPadding}px`,
							borderRadius: 4,
							backgroundColor: "var(--bg1)",
							color: "var(--fg0)",
							minWidth: 100,
						}}
						value={key}
						onSubmit={(newKey) => {
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
						layer={true}
					/>
					<Button
						onClick={() => {
							const newObj = Object.fromEntries(Object.entries(obj).filter(([k, v]) => k !== key))
							onChange(newObj)
						}}
					>
						Delete
					</Button>
					{/* TODO: reorder */}
				</>
			))}
			<div
				style={{
					gridColumn: "1 / -1", // spans the whole row
				}}
			>
				<Button
					onClick={() => {
						const newObj = Object.fromEntries([
							...Object.entries(obj),
							["", t.coerce(dataType.items, undefined)],
						])
						onChange(newObj)
					}}
				>
					New Item
				</Button>
			</div>
		</div>
	)
}

function OrDataTypeForm(props: {
	style?: React.CSSProperties
	dataType: t.OrDataType
	value: any
	onChange: (newValue: any) => void
	layer?: boolean
}) {
	const { dataType, value, onChange, style } = props
	const className = props.layer ? "layer" : ""

	if (dataType.options.length === 0) {
		// We should probably avoid this ever happening.
		return false
	}

	if (dataType.options.length === 1) {
		// Trivial case: or(number)
		return <DataTypeForm {...props} dataType={dataType.options[0]} />
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
				return <DataTypeForm {...props} dataType={dataType.options[0]} />
			}

			case "or": {
				// Trivial case, e.g. or(or(...), or(...)) -> or(..., ...)
				const options = dataType.options as t.OrDataType[]
				const allOptions = options.flatMap((opt) => opt.options)
				return <DataTypeForm {...props} dataType={{ type: "or", options: allOptions }} />
			}

			case "literal": {
				// Select a literal option.
				const options = dataType.options as t.LiteralDataType[]
				return (
					<div style={style}>
						<ComboBoxSelect
							items={options.map((opt) => JSON.stringify(opt.value))}
							value={JSON.stringify(value)}
							onChange={(newOption) => onChange(JSON.parse(newOption))}
						/>
					</div>
				)
			}

			case "object": {
				return (
					<div
						className={className}
						style={{ ...style, ...(props.layer && { margin: -2, padding: 2, borderRadius: 4 }) }}
					>
						<OrObjectPicker {...props} dataType={dataType as t.OrDataType<t.ObjectDataType>} />
					</div>
				)
			}

			case "tuple":
			case "map":
			case "array": {
				return (
					<div
						className={className}
						style={{ ...style, ...(props.layer && { margin: -2, padding: 2, borderRadius: 4 }) }}
					>
						<OrGeneralPicker {...props} />
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
		<div className={className} style={style}>
			<OrGeneralPicker {...props} />
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

	// const initialType = useMemo(() => {
	// 	const validOpt = dataType.options.find((opt) => t.is(opt, value))
	// 	if (validOpt) return validOpt.type
	// 	return types[0]
	// }, [])

	// const [type, setType] = useState(initialType)
	// const currentDataType = dataType.options.find((opt) => opt.type === type)!

	const validOpt = dataType.options.find((opt) => t.is(opt, value))
	const type = validOpt ? validOpt.type : types[0]
	const currentDataType = dataType.options.find((opt) => opt.type === type)!

	return (
		<div style={{ ...style, display: "flex", flexDirection: "column", gap: 8 }}>
			<div>
				<ComboBoxSelect
					items={types}
					value={type}
					onChange={(newType) => {
						const newDataType = dataType.options.find((opt) => opt.type === newType)!
						onChange(t.coerce(newDataType, value))
					}}
				/>
			</div>
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

	// const initialType = useMemo(() => {
	// 	const validOpt = dataType.options.find((opt) => {
	// 		const partial = t.object({ [property]: opt.properties[property] }, false)
	// 		return t.is(partial, value)
	// 	})
	// 	if (validOpt) return validOpt
	// 	return dataType.options[0]
	// }, [])

	// const [type, setType] = useState(initialType)

	let type = dataType.options.find((opt) => {
		const partial = t.object({ [property]: opt.properties[property] }, false)
		return t.is(partial, value)
	})
	if (!type) type = dataType.options[0]

	const literalValue = (dt: t.ObjectDataType) =>
		JSON.stringify((dt.properties[property] as t.LiteralDataType).value)

	// Ignore the property we're already selecting.
	const formType: t.ObjectDataType = { ...type, properties: omit(type.properties, [property]) }

	return (
		<DataTypeForm
			dataType={formType}
			value={value}
			onChange={onChange}
			gridChildren={
				<>
					<div style={{ padding: `${vPadding}px 0px`, color: debug("blue") }}>{property}:</div>
					<ComboBoxSelect
						style={{ width: "fit-content" }}
						items={dataType.options.map(literalValue)}
						value={literalValue(type)}
						onChange={(newValue) => {
							// setType(dataType.options.find((opt) => literalValue(opt) === newValue)!)
							// onChange(t.coerce(t.object({ [property]: t.literal(JSON.parse(newValue)) }), value))
							onChange(
								t.coerce(dataType.options.find((opt) => literalValue(opt) === newValue)!, value)
							)
						}}
					/>
				</>
			}
		/>
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

	// const initialType = useMemo(() => {
	// 	const validOpt = dataType.options.find((opt) => t.is(opt, value))
	// 	if (validOpt) return validOpt
	// 	return dataType.options[0]
	// }, [])

	// const [type, setType] = useState(initialType)

	let type = dataType.options.find((opt) => t.is(opt, value))
	if (!type) type = dataType.options[0]

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<ComboBoxSelect
				items={dataType.options.map((opt) => t.inspect(opt))}
				value={t.inspect(type)}
				onChange={(newValue) => {
					const newType = dataType.options.find((opt) => t.inspect(opt) === newValue)!
					onChange(t.coerce(newType, value))
				}}
			/>
			<DataTypeForm dataType={type} value={value} onChange={onChange} />
		</div>
	)
}
