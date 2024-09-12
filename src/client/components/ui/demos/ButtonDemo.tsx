import React from "react"
import { Button, NakedButton, PrimaryButton } from "../Button"

export function ButtonDemo() {
	return (
		<div style={{ display: "flex", gap: 4, padding: 12 }}>
			<Button>Hello</Button>
			<PrimaryButton>World</PrimaryButton>
			<NakedButton>Yay!</NakedButton>
		</div>
	)
}
