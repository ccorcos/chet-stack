import { get, isArray, isBoolean, isEqual, isNumber, isPlainObject, isString } from "lodash"
import React, { useMemo, useState } from "react"
import * as t from "../../../../shared/DataType"
import { parseDate } from "../../../../shared/dateHelpers"
import { unreachable } from "../../../../shared/typeHelpers"
import { Button } from "../Button"
import { ComboBoxSelect } from "../ComboBox"
import { Input } from "../Input"

export function DataTypeFormDemo() {
	const [dataType, setDataType] = useState<t.DataType>(
		t.object({
			string: t.string,
			// literal: t.optional(t.literal("hello")),
			map: t.map(t.or(t.number, t.string)),
			// array: t.array(
			// 	t.object({
			// 		nested: t.tuple(t.string, t.or(t.number, t.object({ id: t.string }))),
			// 	})
			// ),
		})
	)

	const [value, setValue] = useState<any>({})

	return (
		<div style={{ padding: 8, display: "flex", flexDirection: "row", gap: 8 }}>
			{/* <div style={{ whiteSpace: "pre", fontSize: 12 }}>{JSON.stringify(dataType, null, 2)}</div> */}
			<DataTypeForm dataType={dataType} value={value} onChange={setValue} />
			{/* <DataTypeForm dataType={t.dataTypeDataType} value={dataType} onChange={setDataType} /> */}
		</div>
	)
}

export function DataTypeForm(props: {
	dataType: t.DataType
	value: any
	onChange: (value: any) => void
}) {
	const { dataType, value, onChange } = props

	switch (dataType.type) {
		case "any":
			return <span>{JSON.stringify(value)}</span>
		case "null":
		case "undefined":
			return <span>{dataType.type}</span>
		case "literal":
			return <span>literal: {dataType.value}</span>

		case "string": {
			let str = ""
			if (isString(value)) str = value
			if (isNumber(value) || isBoolean(value) || isArray(value)) str = value.toString()
			if (isPlainObject(value)) str = JSON.stringify(value)
			return <Input value={str} onChange={(event) => onChange(event.target.value)} />
		}
		case "number": {
			let num = 0
			if (isNumber(value)) num = value
			if (isString(value)) num = parseFloat(value)
			return (
				<Input
					type="number"
					value={num}
					onChange={(event) => onChange(parseFloat(event.target.value))}
				/>
			)
		}
		case "boolean": {
			const bool = Boolean(value)
			return (
				<Input
					type="checkbox"
					checked={bool}
					onChange={(event) => onChange(event.target.checked)}
				/>
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
				<Input
					type="datetime"
					value={datetime}
					onChange={(event) => onChange(new Date(event.target.value).toISOString())}
				/>
			)
		}

		case "dataType":
			return <DataTypeInput dataType={value} onChange={onChange} />

		case "array": {
			let items: any[] = []
			if (isArray(value)) items = value
			if (isString(value)) items = value.split(",").map((str) => str.trim())
			if (value !== undefined || value !== null) items.push(value)

			return (
				<div>
					<span>{"["}</span>
					{items.map((item, index) => (
						<div>
							<DataTypeForm
								dataType={dataType.items}
								value={item}
								onChange={(newItem) => {
									onChange(items.map((x) => (x === item ? newItem : x)))
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
					<Button>New Item</Button>
					<span>{"]"}</span>
				</div>
			)
		}

		case "tuple": {
			let tup: any[] = []
			if (isArray(value)) tup = value
			if (value !== null && value !== undefined) tup = [value]

			return (
				<div>
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
									onChange(newValue)
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
				<div>
					{Object.entries(obj).map(([key, value]) => (
						<div style={{ display: "flex" }}>
							<Input
								value={key}
								onChange={(event) => {
									const newKey = event.target.value
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

			return (
				<div>
					{Object.entries(dataType.properties).map(([key, valueDataType]) => {
						const dt = valueDataType.type === "optional" ? valueDataType.value : valueDataType
						return (
							<div>
								<span>{key}:</span>
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
			return <OrDataTypeForm dataType={dataType} value={value} onChange={onChange} />
		}

		default:
			throw unreachable(dataType)
	}
}

function OrDataTypeForm(props: {
	dataType: t.OrDataType<t.DataType>
	value: any
	onChange: (newValue: any) => void
}) {
	const { dataType, value, onChange } = props

	const { initialDt, discriminatingKey, discriminatingOptions } = useMemo(() => {
		const [discriminatingKey, discriminatingOptions] = discriminateDataTypes(dataType.options)
		const validDt = dataType.options.filter((dt) => t.validate(dt, value) === undefined)
		return {
			discriminatingKey,
			discriminatingOptions,
			initialDt: validDt[0] || dataType.options[0],
		}
	}, [props.dataType])

	const [currentDt, setCurrentDt] = useState(initialDt)

	return (
		<>
			<ComboBoxSelect
				style={{ width: 110 }}
				items={discriminatingOptions}
				value={get(currentDt, discriminatingKey)}
				onChange={(newOption) => {
					// // This is trickier than it seems:
					// // object({key: or(number, string)})
					// // discriminating path is properties.key.options.type
					// // value needs to be coerced from 0 to "", etc.

					// // Force it to conform to the new type, and everything else gets coerced in the UI.
					// const newObj = set(cloneDeep(value), discriminatingKey, newValue)
					// onChange(newObj)
					const newDt = dataType.options.find((dt) => get(dt, discriminatingKey) === newOption)!
					setCurrentDt(newDt)
				}}
				placeholder="Select type..."
			/>
			<DataTypeForm dataType={currentDt} value={value} onChange={onChange} />
		</>
	)
}

function coerce(dataType: t.DataType, value: any) {
	if (t.validate(dataType, value) === undefined) return value

	switch (dataType.type) {
		case "string": {
			if (isNumber(value) || isBoolean(value)) {
				return value.toString()
			}
			if (Array.isArray(value)) {
				return value.join(",")
			}
			if (isPlainObject(value)) {
				return JSON.stringify(value)
			}
			return ""
		}

		case "number": {
			if (isBoolean(value)) {
				return value ? 1 : 0
			}
			if (isString(value) || Array.isArray(value)) {
				return value.length
			}
			if (isPlainObject(value)) {
				return Object.keys(value).length
			}
			return 0
		}

		case "boolean": {
			return Boolean(value)
		}

		case "undefined":
			return undefined
		case "null":
			return null

		case "datetime": {
			// Hmm. Shouldn't have to do this. Should be able to be undefined...
			if (isString(value)) {
				return parseDate(value) || new Date().toISOString()
			}
		}

		case "object":
		case "literal":
		case "array":
		case "tuple":
		case "map":
		case "any":
		case "or":
		case "dataType":
		default:
	}
}

function DataTypeInput(props: { dataType: t.DataType; onChange: (dataType: t.DataType) => void }) {
	const { dataType, onChange } = props
	return <DataTypeForm dataType={t.dataTypeDataType} value={dataType} onChange={onChange} />
}

type ObjPath = [string, any]

export function objPaths(obj: any, maxDepth = 3): ObjPath[] {
	if (maxDepth <= 0) return [["", obj]]

	if (Array.isArray(obj)) {
		return obj.flatMap((item, index) => {
			const subPaths = objPaths(item, maxDepth - 1)
			return subPaths.map(([subKey, subObj]) => {
				const sep = subKey === "" ? "" : "."
				return ["[" + index.toString() + "]" + sep + subKey, subObj] as ObjPath
			})
		})
	}

	if (isPlainObject(obj)) {
		return Object.entries(obj).flatMap(([key, item]) => {
			const subPaths = objPaths(item, maxDepth - 1)

			return subPaths.map(([subKey, subObj]) => {
				const sep = subKey === "" ? "" : "."
				return [key + sep + subKey, subObj] as ObjPath
			})
		})
	}

	return [["", obj]]
}

export function discriminatingPaths(paths: ObjPath[][]) {
	const [first, ...rest] = paths
	const commonObj = Object.fromEntries(first.map(([key, value]) => [key, [value]]))

	for (const group of rest) {
		const groupObj = Object.fromEntries(group)
		for (const key in commonObj) {
			if (key in groupObj) {
				if (commonObj[key].some((value) => isEqual(groupObj[key], value))) delete commonObj[key]
				else commonObj[key].push(groupObj[key])
			} else {
				delete commonObj[key]
			}
		}
	}

	return commonObj
}

// TODO: there's definitely a more efficient way of doing objPaths and discriminatingPaths together
// but this is simple to understand and easier.
export function descriminatingDataTypePaths(options: t.DataType[]) {
	const groups = options.map((opt) => objPaths(opt))
	return discriminatingPaths(groups)
}

// TODO: cleanup all these function names and too many of them. On a plane and lazy right now.
export function discriminateDataTypes(options: t.DataType[]) {
	const result = descriminatingDataTypePaths(options)

	let entries = Object.entries(result)
	if (entries.length === 0) throw new Error("Cannot descriminate.")
	if (entries.length === 1) return entries[0]

	// Favor entries called "type"
	const typeEntries = entries.filter(([k, v]) => k.endsWith(".type") || k === "type")
	if (typeEntries.length === 1) return typeEntries[0]
	else if (typeEntries.length > 1) entries = typeEntries

	// Sort by key depth.
	entries.sort((a, b) => a[0].split(".").length - b[0].split(".").length)

	return entries[0]
}
