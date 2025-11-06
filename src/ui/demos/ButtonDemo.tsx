import React from "react"
import { Button, NakedButton, PrimaryButton } from "../Button"

export function ButtonDemo() {
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
			<div>Button</div>
			<Button>Hello</Button>
			<div>PrimaryButton</div>
			<PrimaryButton>World</PrimaryButton>
			<div>NakedButton</div>
			<NakedButton>Yay!</NakedButton>
		</div>
	)
}
