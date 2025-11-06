import React from "react"
import { Badge } from "../Badge"

export function BadgeDemo() {
	return (
		<div style={{ display: "flex", gap: 4, padding: 12 }}>
			<Badge>Hello</Badge>
			<Badge style={{ background: "LightCoral", color: "white" }}>World</Badge>
			<Badge style={{ background: "PowderBlue" }}>Yay!</Badge>
		</div>
	)
}
