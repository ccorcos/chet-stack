import { cubehelix, formatHex, interpolate } from "culori"
import React from "react"
import { css } from "../../../helpers/css"

function cubehelixScale(t: number) {
	// Parameters for cubehelix
	const start = 0 // Starting hue (in rotations)
	const rotations = 1.5 // Number of rotations through the rainbow
	const gamma = 1.0 // Gamma correction for perceptual linearity
	const hue = start + rotations * t

	const lf = 3.5 // lightness factor

	// Use culori's cubehelix function
	return cubehelix({
		mode: "cubehelix",
		h: hue * 360, // culori expects degrees (0-360) instead of rotations
		s: 0.2, // (t / 2) * (1 - 1 / 2), // Controls saturation
		l: t / lf + (1 - 1 / lf), // Lightness
		alpha: gamma,
	})
}

const cubehelixColors = Array.from({ length: 12 }, (_, i) =>
	formatHex(cubehelixScale((11 - i) / 11))
)

// 12 white-to-blue colors (perceptual interpolation)
const whiteToBlue = interpolate(["#ffffff", "rgba(0, 122, 255, 1)"], "lch")
const whiteToBlueColors = Array.from({ length: 12 }, (_, i) => formatHex(whiteToBlue(i / 11 / 2)))

// for (let i = 11; i >= 0; i--) {
for (let i = 0; i < 11; i++) {
	const color = cubehelixColors[i + 1]
	const whiteToBlueColor = whiteToBlueColors[10 - i]

	const selector = Array(i + 1)
		.fill(".layer")
		.join(" ")

	css(`${selector} { background-color: ${color}; }`)
}

function ColorSwatch(props: { color: string }) {
	return (
		<div
			style={{
				backgroundColor: props.color,
				width: "100px",
				height: "100px",
				border: "1px solid black",
			}}
		/>
	)
}
export function ColorsDemo() {
	return (
		<div>
			<div>
				<div>Cubehelix</div>
				<div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
					{cubehelixColors.map((color) => (
						<ColorSwatch key={color} color={color} />
					))}
				</div>
			</div>

			<div>
				<div>White to Blue</div>
				<div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
					{whiteToBlueColors.map((color) => (
						<ColorSwatch key={color} color={color} />
					))}
				</div>
			</div>

			<div className="layer">
				<div>Example</div>
				<div className="layer">Here's another layer</div>
				<div className="layer">
					<div>And another</div>
					<div className="layer">with an inner layer</div>
				</div>
			</div>
		</div>
	)
}
