import React, { useState } from "react"
import { ComboBoxSelect } from "../ComboBox"
import { Input } from "../Input"

// TODO: this is very much a work in progress!
export function FormDemo() {
	const [color, setColor] = useState<string | undefined>()
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "auto 1fr",
				gridGap: 8,
				alignItems: "center",
				padding: 8,
			}}
		>
			<div>Boolean</div>
			<div>
				<Input type="checkbox" />
			</div>

			<div>Number</div>
			<Input type="number" />

			<div>Text</div>
			<Input type="text" />

			<div>Date</div>
			<Input type="date" />

			<div>Select</div>
			<ComboBoxSelect
				items={["red", "orange", "yellow", "green", "blue", "purple"]}
				placeholder="Select an option"
				value={color}
				onChange={(color) => setColor(color)}
			/>

			<div>Multi-Select</div>
			<div>TODO</div>

			<div>Relation</div>
			<div>TODO</div>

			<div>File</div>
			<div>TODO</div>
		</div>
	)
}
