import React from "react"

export function PlaygroundDemo() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			<div>Playground</div>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: 8,
					overflowY: "auto",
				}}
			>
				{Array.from({ length: 1000 }).map((_, i) => (
					<React.Fragment key={i}>
						<div>Column 1 Row {i + 1}</div>
						<div>Column 2 Row {i + 1}</div>
					</React.Fragment>
				))}
			</div>
		</div>
	)
}
