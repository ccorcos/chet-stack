import React, { useState } from "react"
import * as t from "../../../../shared/DataType"
import { tables } from "../../../../shared/EmailModel"
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
			{/* <Example init={t.null_} /> */}
			{/* <Example init={t.undefined_} /> */}
			{/* <Example init={t.string} /> */}
			{/* <Example init={t.number} /> */}
			{/* <Example init={t.boolean} /> */}
			{/* <Example init={t.datetime} /> */}
			{/* <Example init={t.any} /> */}
			{/* <Example init={t.literal("hello")} /> */}
			{/* <Example init={t.array(t.string)} /> */}
			{/* <Example init={t.array(t.array(t.number))} value={[{ a: 1, b: 2 }, { c: 3 }]} /> */}

			{/* <Example init={t.map(t.string)} /> */}
			{/* <Example init={t.map(t.map(t.string))} /> */}

			{/* <Example init={t.tuple(t.literal("user"), t.string)} /> */}
			{/* <Example init={t.tuple(t.literal("user"), t.map(t.string))} /> */}

			{/* <Example init={t.object({ name: t.string, age: t.number, admin: t.boolean })} /> */}
			{/* <Example init={t.object({ name: t.string, age: t.number, tags: t.array(t.string) })} /> */}

			{/* Primitive type discrimination */}
			{/* <Example init={t.or(t.string, t.object({ name: t.string, admin: t.boolean }))} /> */}

			{/* Object literal property discrimination */}
			{/* <Example
				init={t.or(
					t.object({ type: t.literal("user"), name: t.string, admin: t.boolean }),
					t.object({ type: t.literal("message"), subject: t.string, body: t.string })
				)}
			/> */}

			{/* Can't discriminate this well yet - general or picker. */}
			{/* <Example
				init={t.or(
					t.object({ id: t.tuple(t.literal("user"), t.string), name: t.string, admin: t.boolean }),
					t.object({
						id: t.tuple(t.literal("message"), t.string),
						subject: t.string,
						body: t.string,
					})
				)}
			/> */}

			{/* <Example init={t.dataType} /> */}

			{Object.entries(tables).map(([name, schema]) => (
				<div key={name}>
					<div>{name}</div>
					<Example init={schema} />
				</div>
			))}
		</div>
	)
}

function Example(props: { init: t.DataType; value?: any }) {
	const [dataType, setDataType] = useState<t.DataType>(props.init)
	const [value, setValue] = useState<any>(props.value)

	console.log({ dataType, value })
	return (
		<div className="layer" style={{ padding: 8, display: "flex", gap: 8, overflowX: "auto" }}>
			<div style={{ minWidth: 400, flex: "0 0 auto" }}>
				<DataTypeForm
					dataType={t.dataTypeDataType}
					value={dataType}
					onChange={setDataType}
					style={{ width: "fit-content" }}
				/>
			</div>

			<DataTypeForm
				dataType={dataType}
				value={value}
				onChange={setValue}
				style={{ width: "fit-content", flex: "0 0 auto" }}
			/>
		</div>
	)
}
