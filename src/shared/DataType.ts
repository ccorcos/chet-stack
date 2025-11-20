/*

This code was refactored from v0 of data-type-ts library.
It is fundamentally not extensible as a library without a macro system.

TODO:

export const uuid = new t.Validator<string>({
	validate: (value) =>
		t.string.validate(value) ||
		!value.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
			? { message: `${inspectJson(value)} is not a valid UUID.` }
			: undefined,
	inspect: () => "UUID",
})



*/

import isBoolean from "lodash-es/isBoolean"
import isEqual from "lodash-es/isEqual"
import isNumber from "lodash-es/isNumber"
import isPlainObject_ from "lodash-es/isPlainObject"
import isString from "lodash-es/isString"
import mapValues from "lodash-es/mapValues"
import { parseDate } from "./dateHelpers"
import { inspect as inspectJson } from "./inspect"
import { Simplify, unreachable } from "./typeHelpers"

// ============================================================================
// Data Types
// ============================================================================

export interface NullDataType {
	type: "null"
}

export interface UndefinedDataType {
	type: "undefined"
}

export interface StringDataType {
	type: "string"
}

export interface DatetimeDataType {
	type: "datetime"
}

export interface NumberDataType {
	type: "number"
}

export interface BooleanDataType {
	type: "boolean"
}

export interface LiteralDataType<T extends string | number | boolean = string | number | boolean> {
	type: "literal"
	value: T
}

export interface ArrayDataType<T extends DataType = DataType> {
	type: "array"
	items: T
}

export interface TupleDataType<T extends DataType[] = DataType[]> {
	type: "tuple"
	items: T
}

export interface MapDataType<T extends DataType = DataType> {
	type: "map"
	items: T
}

export type Optional<T extends DataType = DataType> = { type: "optional"; value: T }

export interface ObjectDataType<
	T extends { [key: string]: DataType | Optional<DataType> } = {
		[key: string]: DataType | Optional<DataType>
	},
> {
	type: "object"
	properties: T
	strict: boolean
}

export interface AnyDataType<T = any> {
	type: "any"
	_type?: T // Phantom type, doesn't actually exist.
}

export interface OrDataType<T extends DataType = DataType> {
	type: "or"
	options: Array<T>
}

export interface DataTypeDataType {
	type: "dataType"
}

/*

switch
case "string":
case "number":
case "boolean":
case "undefined":
case "object":
case "null":
case "datetime":
case "literal":
case "array":
case "tuple":
case "map":
case "any":
case "or":
case "dataType":

*/

export type DataType =
	| NullDataType
	| UndefinedDataType
	| StringDataType
	| DatetimeDataType
	| NumberDataType
	| BooleanDataType
	| AnyDataType
	| LiteralDataType<string | number | boolean>
	| ArrayDataType<DataType>
	| TupleDataType<DataType[]>
	| MapDataType<DataType>
	| ObjectDataType<{ [key: string]: DataType | Optional<DataType> }>
	| OrDataType<DataType>
	| DataTypeDataType

// ============================================================================
// Type Inference
// ============================================================================

type PickRequired<T extends { [key: string]: DataType | Optional<DataType> }> = {
	[P in keyof T as T[P] extends DataType ? P : never]: T[P] extends DataType
		? InferType<T[P]>
		: never
}
type PickOptional<T extends { [key: string]: DataType | Optional<DataType> }> = {
	[P in keyof T as T[P] extends Optional<infer U> ? P : never]?: T[P] extends Optional<infer U>
		? InferType<U>
		: never
}

type InferObject<T extends { [key: string]: DataType | Optional<DataType> }> = Simplify<
	PickRequired<T> & PickOptional<T>
>

export type InferType<T extends DataType> = T extends NullDataType
	? null
	: T extends UndefinedDataType
		? undefined
		: T extends StringDataType
			? string
			: T extends DatetimeDataType
				? string
				: T extends NumberDataType
					? number
					: T extends BooleanDataType
						? boolean
						: T extends LiteralDataType<infer U>
							? U
							: T extends ArrayDataType<infer U>
								? Array<InferType<U>>
								: T extends TupleDataType<infer U>
									? { [K in keyof U]: InferType<U[K]> }
									: T extends MapDataType<infer U>
										? { [key: string]: InferType<U> }
										: T extends ObjectDataType<infer U>
											? InferObject<U>
											: T extends OrDataType<infer U>
												? InferType<U>
												: T extends AnyDataType<infer U>
													? U
													: T extends DataTypeDataType
														? DataType
														: never

// ============================================================================
// Construction Helpers.
// ============================================================================

export const null_: NullDataType = { type: "null" }
export const undefined_: UndefinedDataType = { type: "undefined" }
export const string: StringDataType = { type: "string" }
export const datetime: DatetimeDataType = { type: "datetime" }
export const number: NumberDataType = { type: "number" }
export const boolean: BooleanDataType = { type: "boolean" }
export const any: AnyDataType = { type: "any" }

// TODO: implement this.
export const uuid = string

// It's important we don't actually use dataTypeDataType externally because it is circular
// and will not serialize.
export const dataType: DataTypeDataType = { type: "dataType" }

export function literal<T extends string | number | boolean>(value: T): LiteralDataType<T> {
	return { type: "literal", value }
}

export function array<T extends DataType>(inner: T): ArrayDataType<T> {
	return { type: "array", items: inner }
}

export function tuple<T extends DataType[]>(...values: T): TupleDataType<T> {
	return { type: "tuple", items: values }
}

export function map<T extends DataType>(inner: T): MapDataType<T> {
	return { type: "map", items: inner }
}

export function optional<T extends DataType>(value: T): Optional<T> {
	return { type: "optional", value }
}

export function object<T extends { [key: string]: DataType | Optional<DataType> }>(
	properties: T,
	strict = true
): ObjectDataType<T> {
	return { type: "object", properties, strict }
}

export function or<T extends DataType[]>(...values: T): OrDataType<T[number]> {
	return { type: "or", options: values }
}

// ============================================================================
// Validation.
// ============================================================================

function isPlainObject(obj: unknown): obj is object {
	return isPlainObject_(obj)
}

export type ValidateError = {
	message: string
	path: Array<number | string>
	children?: Array<ValidateError>
}

type Validator<T extends DataType["type"]> = (
	dataType: Extract<DataType, { type: T }>,
	value: any
) => ValidateError | undefined

/** A map of DataType.type to validator functions. */
const Validators: {
	[K in DataType["type"]]: Validator<K>
} = {
	undefined: (dataType, value) => {
		if (value !== undefined) {
			return {
				message: `${inspectJson(value)} is not undefined`,
				path: [],
			}
		}
	},
	null: (dataType, value) => {
		if (value !== null) {
			return {
				message: `${inspectJson(value)} is not null`,
				path: [],
			}
		}
	},
	string: (dataType, value) => {
		if (!isString(value)) {
			return {
				message: `${inspectJson(value)} is not a string`,
				path: [],
			}
		}
	},
	datetime: (dataType, value) => {
		if (!isString(value)) {
			return {
				message: `${inspectJson(value)} is not a string`,
				path: [],
			}
		}
		if (!value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)) {
			return {
				message: `${inspectJson(value)} is not a valid ISO 8601 datetime string.`,
				path: [],
			}
		}
	},
	number: (dataType, value) => {
		if (!isNumber(value)) {
			return {
				message: `${inspectJson(value)} is not a number`,
				path: [],
			}
		}
	},
	boolean: (dataType, value) => {
		if (!isBoolean(value)) {
			return {
				message: `${inspectJson(value)} is not a boolean`,
				path: [],
			}
		}
	},
	any: (dataType, value) => undefined,
	literal: (dataType, value) => {
		if (!isEqual(value, dataType.value)) {
			return {
				message: `${inspectJson(value)} is not ${inspectJson(dataType.value)}`,
				path: [],
			}
		}
	},
	array: (dataType, value) => {
		if (!Array.isArray(value)) {
			return {
				message: `${inspectJson(value)} is not an array`,
				path: [],
			}
		}
		for (let i = 0; i < value.length; i++) {
			const error = validate(dataType.items, value[i])
			if (error) {
				return {
					...error,
					path: [i, ...error.path],
				}
			}
		}
	},
	tuple: (dataType, value) => {
		if (!Array.isArray(value)) {
			return {
				message: `${inspectJson(value)} is not an array`,
				path: [],
			}
		}
		if (value.length !== dataType.items.length) {
			return {
				message: `${inspectJson(value)} is not a tuple of length ${dataType.items.length}`,
				path: [],
			}
		}
		for (let i = 0; i < dataType.items.length; i++) {
			const error = validate(dataType.items[i], value[i])
			if (error) {
				return {
					...error,
					path: [i, ...error.path],
				}
			}
		}
	},
	map: (dataType, value) => {
		if (!isPlainObject(value)) {
			return {
				message: `${inspectJson(value)} is not a map`,
				path: [],
			}
		}
		for (const key in value) {
			const error = validate(dataType.items, value[key])
			if (error) {
				return {
					...error,
					path: [key, ...error.path],
				}
			}
		}
	},
	object: (dataType, value) => {
		if (!isPlainObject(value)) {
			return {
				message: `${inspectJson(value)} is not an object`,
				path: [],
			}
		}
		for (const key in dataType.properties) {
			let dt: DataType
			if (dataType.properties[key].type === "optional") {
				dt = dataType.properties[key].value
				if (dt.type === "or") {
					// If the existing type is a union, then just add undefined as an option.
					if (!dt.options.some((t) => t.type === "undefined")) {
						dt = or(undefined_, ...dt.options)
					}
				} else {
					dt = or(undefined_, dt)
				}
			} else {
				dt = dataType.properties[key]
			}
			const error = validate(dt, value[key])
			if (error) {
				return {
					...error,
					path: [key, ...error.path],
				}
			}
		}

		if (dataType.strict) {
			for (const key in value) {
				if (!(key in dataType.properties)) {
					return {
						message: `${inspectJson(value)} has extra property ${inspectJson(key)}`,
						path: [],
					}
				}
			}
		}
	},
	or: (dataType, value) => {
		const errors: Array<ValidateError> = []
		for (const dt of dataType.options) {
			const error = validate(dt, value)
			if (!error) return
			errors.push(error)
		}
		// TODO: find discriminating keys so we can report just one message.
		return {
			message: `${inspectJson(value)} must satisfy one of:`,
			path: [],
			children: errors,
		}
	},
	dataType: (dataType, value) => {
		return validate(dataTypeDataType, value)
	},
}

export function validate<T extends DataType>(dataType: T, value: any): ValidateError | undefined {
	const validator = Validators[dataType.type]
	return validator(dataType as any, value)
}

// Function overload to prevent infinite recursie type inference.
// export function is<T extends DataType>(dataType: T, value: any): value is InferType<T>
export function is(dataType: DataType, value: any): boolean {
	return !validate(dataType, value)
}

function pathToString(path: Array<string | number>) {
	return path
		.map((item) => {
			if (isNumber(item)) {
				return `[${item}]`
			}
			if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(item)) {
				return `.${item}`
			}
			return `[${inspectJson(item)}]`
		})
		.join("")
}

function indent(str: string) {
	return "  " + str.split("\n").join("\n  ")
}

export function formatError(error: ValidateError) {
	let str = ""
	if (error.path.length) {
		str += pathToString(error.path)
		str += ": "
	}
	str += error.message
	if (error.children) {
		str += "\n"
		str += indent(error.children.map(formatError).join("\n"))
	}
	return str
}

// ============================================================================
// Inspection.
// ============================================================================

type Inspector<T extends DataType["type"] = DataType["type"]> = (
	dataType: Extract<DataType, { type: T }>,
	recur: (dataType: DataType) => string
) => string

/** A map of DataType.type to validator functions. */
const Inspectors: {
	[K in DataType["type"]]: Inspector<K>
} = {
	null: (dataType) => "null",
	undefined: (dataType) => "undefined",
	string: (dataType) => "string",
	datetime: (dataType) => "datetime",
	number: (dataType) => "number",
	boolean: (dataType) => "boolean",
	literal: (dataType) => inspectJson(dataType.value),
	array: (dataType, recur) => "Array<" + recur(dataType.items) + ">",
	tuple: (dataType, recur) => "[" + dataType.items.map(recur).join(", ") + "]",
	map: (dataType, recur) => "{ [key: string]: " + recur(dataType.items) + " }",
	object: (dataType, recur) =>
		"{ " +
		[
			...Object.keys(dataType.properties).map((key) => {
				const property = dataType.properties[key]
				const isOptional = property.type === "optional"
				const propertyToInspect = isOptional ? property.value : property
				return key + (isOptional ? "?: " : ": ") + recur(propertyToInspect)
			}),
		].join("; ") +
		" }",
	any: (dataType) => "any",
	or: (dataType, recur) => dataType.options.map((opt) => recur(opt)).join(" | "),
	dataType: (dataType) => "DataType",
}

export function inspect<T extends DataType>(dataType: T, path?: Set<DataType>): string {
	if (!path) path = new Set()
	if (path.has(dataType)) return "[Circular]"
	path.add(dataType)
	return Inspectors[dataType.type](dataType as any, (dt) => inspect(dt, new Set(path)))
}

// ============================================================================
// DataType DataType.
// ============================================================================

// We're going to mutate this array to avoid circular references. This type cannot be
// serialized so use {type: "dataType"} instead.
export const dataTypeDataType: OrDataType<DataType> = { type: "or", options: [] }

const dataTypeDataTypes: { [K in DataType["type"]]: DataType } = {
	null: object({ type: literal("null") }),
	undefined: object({ type: literal("undefined") }),
	string: object({ type: literal("string") }),
	datetime: object({ type: literal("datetime") }),
	number: object({ type: literal("number") }),
	boolean: object({ type: literal("boolean") }),
	any: object({ type: literal("any") }),
	literal: object({
		type: literal("literal"),
		value: or(string, number, boolean),
	}),
	array: object({
		type: literal("array"),
		items: dataType,
	}),
	tuple: object({
		type: literal("tuple"),
		items: array(dataType),
	}),
	map: object({
		type: literal("map"),
		items: dataType,
	}),
	object: object({
		type: literal("object"),
		// Other options are pushed below.
		properties: map(or(object({ type: literal("optional"), value: dataType }))),
		strict: boolean,
	}),
	or: object({
		type: literal("or"),
		options: array(dataType),
	}),
	dataType: object({ type: literal("dataType") }),
}

for (const value of Object.values(dataTypeDataTypes))
	dataTypeDataType.options.push(value)

	// Add the other data types here so that the dataType dropdown shows all options.
;(
	((dataTypeDataTypes.object as ObjectDataType).properties["properties"] as MapDataType)
		.items as OrDataType<DataType>
).options.push(...dataTypeDataType.options)

/**
 * This will return undefined if we can't make a reasonable conversion.
 * This is useful so that when converting an array, we can cleanup anything that doesnt convert.
 */
export function convert(dataType: DataType, value: any): any {
	// if (dataType.type === "optional") {
	// 	if (value === undefined) return undefined
	// 	dataType = dataType.value
	// }

	if (is(dataType, value)) return value

	const { type } = dataType
	switch (type) {
		case "any": {
			return value
		}

		case "undefined":
			return undefined

		case "null":
			return null

		case "literal": {
			return dataType.value
		}

		case "boolean": {
			return Boolean(value)
		}

		case "string": {
			if (isNumber(value) || isBoolean(value)) {
				return value.toString()
			}
			if (Array.isArray(value)) {
				return value.join(", ")
			}
			// if (isPlainObject(value)) {
			// 	return JSON.stringify(value)
			// }
			return undefined
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
			return undefined
		}

		case "datetime": {
			if (isString(value)) {
				return parseDate(value)
			}

			return undefined
		}

		case "array": {
			if (isString(value)) value = value.split(",").map((item) => item.trim())

			if (Array.isArray(value)) {
				value = value.map((item) => convert(dataType.items, item))
			} else {
				value = [convert(dataType.items, value)]
			}

			const array = value.filter((item) => is(dataType.items, item))
			if (array.length === 0) return undefined
			return array
		}

		case "map": {
			if (!isPlainObject(value)) return undefined
			const map = mapValues(value, (item) => convert(dataType.items, item))
			for (const key in map) if (!is(dataType.items, map[key])) delete map[key]
			return map
		}

		case "object": {
			const obj = {}
			if (isPlainObject(value)) Object.assign(obj, value)

			// if (isString(value)) {
			// 	try {
			// 		const parsed = JSON.parse(value)
			// 		if (isPlainObject())
			// 	}
			// }

			for (const [property, propertyType] of Object.entries(dataType.properties)) {
				if (propertyType.type == "optional") {
					if (!(property in obj)) continue
					obj[property] = convert(propertyType.value, obj[property])
				} else {
					const propertyValue = convert(propertyType, obj[property])
					if (!is(propertyType, propertyValue)) return undefined
					obj[property] = propertyValue
				}
			}

			if (dataType.strict) {
				for (const property in obj) {
					if (!(property in dataType.properties)) delete obj[property]
				}
			}

			return obj
		}

		case "tuple": {
			// There's some more thoughtful stuff we could probably do here.
			// For example string -> ["user", string] could put the string in there.
			if (Array.isArray(value)) {
				const tuple = dataType.items.map((dt, index) => convert(dt, value[index]))
				if (is(dataType, tuple)) return tuple
			}
			return undefined
		}

		case "or": {
			for (const option of dataType.options) {
				if (option.type === "undefined") return
				const converted = convert(option, value)
				if (is(option, converted)) return converted
			}
			return
		}

		case "dataType":
			return undefined

		default: {
			throw unreachable(type)
		}
	}
}

export function coerce(dataType: DataType, value: any): any {
	const converted = convert(dataType, value)

	// if (dataType.type === "optional") {
	// 	return converted
	// }

	if (is(dataType, converted)) return converted

	// We can start with the converted value and coerce it because it could be partially converted.
	const { type } = dataType
	switch (type) {
		case "any":
		case "undefined":
		case "null":
		case "literal":
			return converted

		case "boolean": {
			return false
		}

		case "string": {
			return ""
		}

		case "number": {
			return 0
		}

		case "datetime": {
			return new Date().toISOString()
		}

		case "array": {
			return []
		}

		case "map": {
			return {}
		}

		case "object": {
			const obj = {}
			if (isPlainObject(value)) Object.assign(obj, value)

			for (const [property, propertyType] of Object.entries(dataType.properties)) {
				if (propertyType.type == "optional") {
					if (!(property in obj)) continue
					const propertyValue = coerce(propertyType.value, obj[property])
					if (propertyValue === undefined) continue
					obj[property] = propertyValue
				} else {
					const propertyValue = coerce(propertyType, obj[property])
					obj[property] = propertyValue
				}
			}

			if (dataType.strict) {
				for (const property in obj) {
					if (!(property in dataType.properties)) delete obj[property]
				}
			}

			return obj
		}

		case "tuple": {
			return dataType.items.map((dt) => coerce(dt, undefined))
		}

		case "or": {
			return coerce(dataType.options[0], undefined)
		}

		case "dataType":
			return string

		default: {
			throw unreachable(type)
		}
	}
}
