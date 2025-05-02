import React, { useState } from "react"
import * as t from "../../../../shared/DataType"
import { DataTypeForm } from "../DataTypeForm"

/*

t.or(t.string, t.number)
-> dropdown(["string", "number"])

t.or(t.object({type: "string"}), t.object({type: "number"}))
-> type: dropdown(["string", "number"])

Using inspect for most general case.
t.or(t.number, t.object({type: "string"}), t.object({a: t.number}), t.object({b: t.string}))
-> dropdown(["number", "{type: "string"}", {a: number}, {b: number}"])

*/

// TODO: edit schema and value side by side.
// TODO: object optional property

// case "object":
// case "or":

export function DataTypeFormDemo() {
	return (
		<div style={{ display: "flex", flexDirection: "column", padding: 8, gap: 12 }}>
			<Example init={t.null_} />
			<Example init={t.undefined_} />
			<Example init={t.string} />
			<Example init={t.number} />
			<Example init={t.boolean} />
			<Example init={t.datetime} />
			<Example init={t.any} />
			<Example init={t.literal("hello")} />
			<Example init={t.array(t.string)} />
			<Example init={t.map(t.string)} />
			<Example init={t.tuple(t.literal("user"), t.string)} />
			<Example init={t.dataType} />
			<Example init={t.object({ name: t.string, age: t.number, admin: t.boolean })} />
			{/* Primitive type discrimination */}
			<Example init={t.or(t.string, t.number)} />
			{/* Object literal property discrimination */}
			<Example
				init={t.or(
					t.object({ type: t.literal("user"), name: t.string, admin: t.boolean }),
					t.object({ type: t.literal("message"), subject: t.string, body: t.string })
				)}
			/>

			{/* Can't discriminate this well yet - general or picker. */}
			<Example
				init={t.or(
					t.object({ id: t.tuple(t.literal("user"), t.string), name: t.string, admin: t.boolean }),
					t.object({
						id: t.tuple(t.literal("message"), t.string),
						subject: t.string,
						body: t.string,
					})
				)}
			/>
		</div>
	)
}

function Example(props: { init: t.DataType }) {
	const [dataType, setDataType] = useState<t.DataType>(props.init)
	return (
		<div className="layer" style={{ padding: 8 }}>
			<DataTypeForm dataType={t.dataTypeDataType} value={dataType} onChange={setDataType} />
		</div>
	)
}
