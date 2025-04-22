/*

This code was refactored from v0 of data-type-ts library.
It is fundamentally not extensible as a library without a macro system.

TODO:

export const uuid = new t.Validator<string>({
	validate: (value) =>
		t.string.validate(value) ||
		!value.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
			? { message: `${JSON.stringify(value)} is not a valid UUID.` }
			: undefined,
	inspect: () => "UUID",
})



*/

import isBoolean from "lodash/isBoolean"
import isEqual from "lodash/isEqual"
import isNumber from "lodash/isNumber"
import isPlainObject_ from "lodash/isPlainObject"
import isString from "lodash/isString"
import { Simplify } from "./typeHelpers"

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

export interface LiteralDataType<T extends string | number | boolean> {
	type: "literal"
	value: T
}

export interface ArrayDataType<T extends DataType> {
	type: "array"
	items: T
}

export interface TupleDataType<T extends DataType[]> {
	type: "tuple"
	items: T
}

export interface MapDataType<T extends DataType> {
	type: "map"
	items: T
}

export type Optional<T extends DataType> = { type: "optional"; value: T }

export interface ObjectDataType<T extends { [key: string]: DataType | Optional<DataType> }> {
	type: "object"
	properties: T
	strict: boolean
}

export interface AnyDataType<T = any> {
	type: "any"
	_type?: T // Phantom type, doesn't actually exist.
}

export interface OrDataType<T extends DataType> {
	type: "or"
	options: Array<T>
}

export interface DataTypeDataType {
	type: "dataType"
}

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
				message: `${JSON.stringify(value)} is not undefined`,
				path: [],
			}
		}
	},
	null: (dataType, value) => {
		if (value !== null) {
			return {
				message: `${JSON.stringify(value)} is not null`,
				path: [],
			}
		}
	},
	string: (dataType, value) => {
		if (!isString(value)) {
			return {
				message: `${JSON.stringify(value)} is not a string`,
				path: [],
			}
		}
	},
	datetime: (dataType, value) => {
		if (!isString(value)) {
			return {
				message: `${JSON.stringify(value)} is not a string`,
				path: [],
			}
		}
		if (!value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)) {
			return {
				message: `${JSON.stringify(value)} is not a valid ISO 8601 datetime string.`,
				path: [],
			}
		}
	},
	number: (dataType, value) => {
		if (!isNumber(value)) {
			return {
				message: `${JSON.stringify(value)} is not a number`,
				path: [],
			}
		}
	},
	boolean: (dataType, value) => {
		if (!isBoolean(value)) {
			return {
				message: `${JSON.stringify(value)} is not a boolean`,
				path: [],
			}
		}
	},
	any: (dataType, value) => undefined,
	literal: (dataType, value) => {
		if (!isEqual(value, dataType.value)) {
			return {
				message: `${JSON.stringify(value)} is not ${JSON.stringify(dataType.value)}`,
				path: [],
			}
		}
	},
	array: (dataType, value) => {
		if (!Array.isArray(value)) {
			return {
				message: `${JSON.stringify(value)} is not an array`,
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
				message: `${JSON.stringify(value)} is not an array`,
				path: [],
			}
		}
		if (value.length !== dataType.items.length) {
			return {
				message: `${JSON.stringify(value)} is not a tuple of length ${dataType.items.length}`,
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
				message: `${JSON.stringify(value)} is not a map`,
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
				message: `${JSON.stringify(value)} is not an object`,
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
						message: `${JSON.stringify(value)} has extra property ${JSON.stringify(key)}`,
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
			message: `${JSON.stringify(value)} must satisfy one of:`,
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

export function is<T extends DataType>(dataType: T, value: any): value is InferType<T> {
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
			return `[${JSON.stringify(item)}]`
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

type Inspector<T extends DataType["type"]> = (dataType: Extract<DataType, { type: T }>) => string

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
	literal: (dataType) => JSON.stringify(dataType.value),
	array: (dataType) => "Array<" + inspect(dataType.items) + ">",
	tuple: (dataType) => "[" + dataType.items.map(inspect).join(", ") + "]",
	map: (dataType) => "{ [key: string]: " + inspect(dataType.items) + " }",
	object: (dataType) =>
		"{ " +
		[
			...Object.keys(dataType.properties).map((key) => {
				const property = dataType.properties[key]
				const isOptional = property.type === "optional"
				const propertyToInspect = isOptional ? property.value : property
				return key + (isOptional ? "?: " : ": ") + inspect(propertyToInspect)
			}),
		].join("; ") +
		" }",
	any: (dataType) => "any",
	or: (dataType) => dataType.options.map(inspect).join(" | "),
	dataType: (dataType) => "DataType",
}

export function inspect<T extends DataType>(dataType: T): string {
	return Inspectors[dataType.type](dataType as any)
}

// ============================================================================
// DataType DataType.
// ============================================================================

// We're going to mutate this array to avoid circular references. This type cannot be
// serialized so use {type: "dataType"} instead.
const dataTypeDataType: OrDataType<DataType> = { type: "or", options: [] }

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
		items: dataTypeDataType,
	}),
	tuple: object({
		type: literal("tuple"),
		items: array(dataTypeDataType),
	}),
	map: object({
		type: literal("map"),
		items: dataTypeDataType,
	}),
	object: object({
		type: literal("object"),
		properties: map(
			or(dataTypeDataType, object({ type: literal("optional"), value: dataTypeDataType }))
		),
		strict: boolean,
	}),
	or: object({
		type: literal("or"),
		options: array(dataTypeDataType),
	}),
	dataType: object({ type: literal("dataType") }),
}

for (const value of Object.values(dataTypeDataTypes)) dataTypeDataType.options.push(value)
