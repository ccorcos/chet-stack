import React from "react"
import { Input, NakedInput } from "../Input"

export function InputDemo() {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "auto auto",
				width: "fit-content",
				gap: 8,
				padding: 12,
			}}
		>
			<div>Text Input</div>
			<Input type="text" placeholder="Hello" />
			<div>Disabled Input</div>
			<Input type="text" placeholder="Hello" disabled />
			<div>Number Input</div>
			<Input type="number" placeholder="123" />
			<div>Date Input</div>
			<Input type="date" placeholder="2024-01-01" />
			<div>Naked Input</div>
			<NakedInput type="text" placeholder="Hello" />
			<div>Slider Input</div>
			<Input type="range" min="0" max="100" defaultValue="50" />
		</div>
	)
}
