import { describe, it } from "mocha"
import { strict as assert } from "node:assert"
import * as t from "./DataType"
import {
	ArrayDataType,
	BooleanDataType,
	InferType,
	LiteralDataType,
	MapDataType,
	NullDataType,
	NumberDataType,
	ObjectDataType,
	Optional,
	OrDataType,
	StringDataType,
	TupleDataType,
	UndefinedDataType,
} from "./DataType"
import { Assert } from "./typeHelpers"

// InferType tests.
type InferTests =
	| Assert<InferType<NullDataType>, null>
	| Assert<InferType<UndefinedDataType>, undefined>
	| Assert<InferType<StringDataType>, string>
	| Assert<InferType<NumberDataType>, number>
	| Assert<InferType<BooleanDataType>, boolean>
	| Assert<InferType<LiteralDataType<12>>, 12>
	| Assert<InferType<LiteralDataType<"hello">>, "hello">
	| Assert<InferType<LiteralDataType<true>>, true>
	| Assert<InferType<LiteralDataType<string>>, string>
	| Assert<InferType<t.AnyDataType>, any>
	| Assert<InferType<t.AnyDataType<string>>, string>
	| Assert<InferType<ArrayDataType<StringDataType>>, Array<string>>
	| Assert<InferType<ArrayDataType<NumberDataType>>, Array<number>>
	| Assert<
			InferType<TupleDataType<[LiteralDataType<"hello">, StringDataType, NumberDataType]>>,
			["hello", string, number]
	  >
	| Assert<InferType<MapDataType<StringDataType>>, { [key: string]: string }>
	| Assert<InferType<MapDataType<NumberDataType>>, { [key: string]: number }>
	| Assert<
			InferType<
				ObjectDataType<{
					a: LiteralDataType<"hello">
					b: StringDataType
					c: Optional<NumberDataType>
				}>
			>,
			{ a: "hello"; b: string; c?: number }
	  >
	| Assert<
			// @ts-expect-error
			InferType<
				ObjectDataType<{
					a: LiteralDataType<"hello">
					b: StringDataType
					c: Optional<NumberDataType>
				}>
			>,
			{ a: "hello"; b: string; c: number }
	  >
	| Assert<
			InferType<OrDataType<LiteralDataType<true> | StringDataType | NumberDataType>>,
			true | string | number
	  >

describe("DataType", () => {
	const valid = (dt: t.DataType, value: any) => {
		const result = t.validate(dt, value)
		assert.equal(!result, true, result ? t.formatError(result) : "")
	}
	const invalid = (dt: t.DataType, value: any) => {
		const result = t.validate(dt, value)
		assert.equal(!!result, true, result ? t.formatError(result) : "")
	}

	it("validate", () => {
		// String validation
		valid(t.string, "hello")
		valid(t.string, "")
		invalid(t.string, 123)
		invalid(t.string, true)
		invalid(t.string, null)
		invalid(t.string, undefined)

		// Number validation
		valid(t.number, 123)
		valid(t.number, 0)
		valid(t.number, -1.5)
		invalid(t.number, "123")
		invalid(t.number, true)
		invalid(t.number, null)

		// Boolean validation
		valid(t.boolean, true)
		valid(t.boolean, false)
		invalid(t.boolean, "true")
		invalid(t.boolean, 1)
		invalid(t.boolean, null)

		// Null validation
		valid(t.null_, null)
		invalid(t.null_, undefined)
		invalid(t.null_, "null")
		invalid(t.null_, 0)

		// Undefined validation
		valid(t.undefined_, undefined)
		invalid(t.undefined_, null)
		invalid(t.undefined_, "undefined")

		// Any validation
		valid(t.any, null)
		valid(t.any, undefined)
		valid(t.any, "hello")
		valid(t.any, 123)
		valid(t.any, true)
		valid(t.any, false)
		valid(t.any, [])
		valid(t.any, {})

		// Literal validation
		valid(t.literal("hello"), "hello")
		invalid(t.literal("hello"), "world")
		valid(t.literal(42), 42)
		invalid(t.literal(42), 43)
		valid(t.literal(true), true)
		invalid(t.literal(true), false)

		// Array validation
		valid(t.array(t.string), ["hello", "world"])
		invalid(t.array(t.string), [123, "world"])
		invalid(t.array(t.string), { a: "hello", b: "world" })
		invalid(t.array(t.string), true)
		invalid(t.array(t.string), null)
		invalid(t.array(t.string), undefined)
		valid(t.array(t.or(t.number, t.string)), [])
		valid(t.array(t.or(t.number, t.string)), [123])
		valid(t.array(t.or(t.number, t.string)), ["123"])
		valid(t.array(t.or(t.number, t.string)), ["123", 123])
		invalid(t.array(t.or(t.number, t.string)), ["123", 123, true])

		// Tuple validation
		valid(t.tuple(t.string, t.number), ["hello", 123])
		invalid(t.tuple(t.string, t.number), ["hello", 123, true])
		invalid(t.tuple(t.string, t.number), [123, "hello"])
		invalid(t.tuple(t.string, t.number), { a: "hello", b: 123 })
		invalid(t.tuple(t.string, t.number), true)
		invalid(t.tuple(t.string, t.number), null)
		invalid(t.tuple(t.string, t.number), undefined)

		// Map validation
		valid(t.map(t.string), { a: "hello", b: "world" })
		invalid(t.map(t.string), { a: "hello", b: 123 })
		invalid(t.map(t.string), [123, "hello"])
		invalid(t.map(t.string), true)
		invalid(t.map(t.string), null)
		invalid(t.map(t.string), undefined)

		// Or validation
		valid(t.or(t.string, t.number), "hello")
		valid(t.or(t.string, t.number), 123)
		invalid(t.or(t.string, t.number), true)
		invalid(t.or(t.string, t.number), null)
		invalid(t.or(t.string, t.number), undefined)

		// Object validation
		const user = t.object({
			id: t.string,
			age: t.optional(t.number),
		})

		type User = InferType<typeof user>
		type Test = Assert<User, { id: string; age?: number }>
		// @ts-expect-error
		type MissingOptional = Assert<User, { id: string; age: number }>
		// @ts-expect-error
		type MissiontOptionalUndefined = Assert<User, { id: string; age: number | undefined }>

		assert.deepEqual(user, {
			type: "object",
			properties: {
				id: { type: "string" },
				age: { type: "optional", value: { type: "number" } },
			},
			strict: true,
		})

		valid(user, { id: "123", age: 12 })
		valid(user, { id: "123" })
		invalid(user, { id: "123", age: "hello" })
		invalid(user, { age: "hello" })

		invalid(user, { id: "123", age: 12, extra: true })
		valid({ ...user, strict: false }, { id: "123", age: 12, extra: true })
	})

	it("is", () => {
		// Test is() function
		let thing: any
		assert.equal(t.is(t.string, thing), false)
		if (t.is(t.string, thing)) {
			type ThingIsString = Assert<typeof thing, string>
		}
	})

	it("dataTypeDataType", () => {
		const ThingType = t.object({
			a: t.string,
			b: t.optional(t.number),
			c: t.or(t.boolean, t.null_, t.undefined_),
			d: t.array(t.any),
			e: t.map(t.tuple(t.string, t.number)),
		})
		valid(t.dataType, ThingType)
	})

	it("handles infinite recursion", () => {
		const dt = t.string as t.DataType
		// This should not be an infinite type inference error.
		t.is(dt, 123)

		// The error message here should not cause infinite JSON.stringify recursion.
		t.is(t.dataType, {})

		// The error message here should not cause infinite inspect recursion.
		t.inspect(t.dataTypeDataType)
	})
})
