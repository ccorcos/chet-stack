import { cubehelix, differenceCiede2000, formatHex, interpolate } from "culori"
import React, { useMemo } from "react"
import { css } from "../../../helpers/css"

const n = 6
const rotations = 0.1 // Number of rotations through the rainbow
const start = 0.9

const stretchEnd = (t: number, f: number) => t / f + (1 - 1 / f)

function cube(
	t: number,
	args: {
		saturation: number
		lightness: number
	}
) {
	const { saturation: s, lightness: l } = args
	const hue = start + rotations * t
	return cubehelix({ mode: "cubehelix", h: hue * 360, s: s, l: l, alpha: 1 })
}

const whiteBackgroundTheme = (i: number) =>
	cube(i, {
		saturation: 0.4 - 0.4 * (1 - i),
		lightness: stretchEnd(i, 5.5),
	})

const whiteCubehelixScale = whiteBackgroundTheme

const whiteCubehelixColors = Array.from({ length: n }, (_, i) =>
	formatHex(whiteCubehelixScale((n - 1 - i) / (n - 1)))
)

function lightCubehelixScale(t: number) {
	const hue = start + rotations * t

	let f = 2.5 // lightness factor
	let l = 0.5

	// Use culori's cubehelix function
	return cubehelix({
		mode: "cubehelix",
		h: hue * 360, // culori expects degrees (0-360) instead of rotations
		s: 1, // Controls saturation

		l: l,
		alpha: 1,
	})
}

const lightCubehelixColors = Array.from({ length: n }, (_, i) =>
	formatHex(lightCubehelixScale((n - 1 - i) / (n - 1)))
)

function blackCubehelixScale(t: number) {
	const hue = start + rotations * t

	const lf = 2.5 - 1.5 * Math.pow(t, 0.9) // lightness factor

	t = 1 - t
	// Compress the lightness at the beginning
	// t = Math.pow(t, 0.9)

	// Use culori's cubehelix function
	return cubehelix({
		mode: "cubehelix",
		h: hue * 360, // culori expects degrees (0-360) instead of rotations
		alpha: 1,

		s: 0.2 - 0.1 * t, // Controls saturation
		l: t / lf, // Lightness
	})
}

const blackCubehelixColors = Array.from({ length: n }, (_, i) =>
	formatHex(blackCubehelixScale((n - 1 - i) / (n - 1)))
)

// 12 white-to-blue colors (perceptual interpolation)
const whiteToBlue = interpolate(["#ffffff", "rgba(0, 122, 255, 1)"], "lch")
const whiteToBlueColors = Array.from({ length: n }, (_, i) => formatHex(whiteToBlue(i / (n - 1))))

const whiteToBlack = interpolate(["#ffffff", "#000000"], "lch")
const whiteToBlackColors = Array.from({ length: 7 }, (_, i) => formatHex(whiteToBlack(i / 6)))

const blackToWhite = interpolate(["#000000", "#ffffff"], "lch")
const blackToWhiteColors = Array.from({ length: 4 }, (_, i) => formatHex(blackToWhite(i / 3)))

LAYER_EXAMPLE: {
	// for (let i = 11; i >= 0; i--) {
	for (let i = 0; i < n; i++) {
		const color = whiteCubehelixColors[i + 1]

		const selector = Array(i + 1)
			.fill(".layer")
			.join(" ")

		css(`${selector} { background-color: ${color}; }`)
	}
}

type Theme = {
	background: string[]
	foreground: string[]
}

const shiftTheme = (theme: Theme) => {
	return {
		background: theme.background.slice(1),
		foreground: theme.foreground, //.slice(1),
	}
}

const whiteTheme: Theme = {
	background: whiteCubehelixColors,
	foreground: blackToWhiteColors,
}
const blackTheme: Theme = {
	background: blackCubehelixColors,
	foreground: whiteToBlackColors,
}

function ColorSwatch(props: { color: string; children?: React.ReactNode }) {
	return (
		<div
			style={{
				backgroundColor: props.color,
				width: "100px",
				height: "100px",
				border: "1px solid black",
			}}
		>
			{props.children}
		</div>
	)
}

const diffColor = differenceCiede2000()

function SwatchList(props: { colors: string[] }) {
	return (
		<div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
			{props.colors.map((color, index) => {
				const textColor =
					diffColor(color, "#000000") > diffColor(color, "#ffffff") ? "#000000" : "#ffffff"

				const divPrev = index === 0 ? 0 : diffColor(props.colors[index - 1], color)
				return (
					<ColorSwatch key={color} color={color}>
						<div style={{ color: textColor }}>{color}</div>
						<div style={{ color: textColor }}>{Math.round(divPrev * 100) / 100}</div>
					</ColorSwatch>
				)
			})}
		</div>
	)
}

function SwatchPyramid(props: { colors: string[] }) {
	const d = 40
	const s = 600
	return (
		<div>
			{props.colors.reduceRight(
				(acc, color, index) => (
					<div
						key={index}
						style={{
							backgroundColor: color,
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							width: s - d * index + "px",
							height: s - d * index + "px",
						}}
					>
						{acc}
					</div>
				),
				<div></div>
			)}
		</div>
	)
}

function FormExample(props: { theme: Theme }) {
	const { theme } = props
	const [b1, b2, b3, b4, b5] = theme.background
	const [f1, f2, f3, f4, f5] = theme.foreground

	const reset: React.CSSProperties = {
		border: "none",
		padding: "4px 6px",
		borderRadius: 4,
		color: f1,
	}

	const className = useMemo(() => {
		const className = `form-` + Math.random().toString(36).substring(2, 15)
		css(`
			.${className} input::placeholder {
				color: ${f3};
			}
		`)
		return className
	}, [])

	return (
		<div
			className={className}
			style={{
				padding: 20,
				minWidth: 350,
				display: "flex",
				flexDirection: "column",
				gap: 12,
				maxWidth: 300,
				background: b1,
				color: f1,
			}}
		>
			<h3 style={{ marginBottom: 0 }}>Welcome to the form</h3>
			<p style={{ marginTop: 6, marginBottom: 6 }}>Please sign up.</p>
			<div>
				<strong>Name:</strong>
			</div>
			<input placeholder="John Doe" style={{ ...reset, background: b2 }} />
			<div>
				<strong>Email:</strong>
			</div>
			<input placeholder="john@doe.com" style={{ ...reset, background: b2 }} />
			<div>
				<button style={{ ...reset, background: b2 }}>Sign up</button>
			</div>
		</div>
	)
}

export function ColorsDemo() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 12, margin: 12 }}>
			<SwatchList colors={lightCubehelixColors} />
			<SwatchList colors={whiteTheme.background} />
			<SwatchList colors={blackTheme.background} />
			<div style={{ display: "flex", flexDirection: "row", gap: 12 }}>
				<FormExample theme={whiteTheme} />
				<FormExample theme={shiftTheme(whiteTheme)} />
				<FormExample theme={shiftTheme(shiftTheme(whiteTheme))} />
				<FormExample theme={shiftTheme(shiftTheme(shiftTheme(whiteTheme)))} />
			</div>
			<div style={{ display: "flex", flexDirection: "row", gap: 12 }}>
				<FormExample theme={blackTheme} />
				<FormExample theme={shiftTheme(blackTheme)} />
				<FormExample theme={shiftTheme(shiftTheme(blackTheme))} />
				<FormExample theme={shiftTheme(shiftTheme(shiftTheme(blackTheme)))} />
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				<SwatchList colors={whiteTheme.background} />
				<SwatchList colors={blackTheme.background} />
				<SwatchList colors={whiteTheme.foreground} />
				<SwatchList colors={blackTheme.foreground} />
			</div>

			<div style={{ display: "flex", flexDirection: "row", gap: 12 }}>
				<SwatchPyramid colors={whiteTheme.background} />
				<SwatchPyramid colors={blackTheme.background} />
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				<div>White to Blue</div>
				<SwatchList colors={whiteToBlueColors} />
				<SwatchPyramid colors={whiteToBlueColors} />
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
