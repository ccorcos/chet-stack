import { Cubehelix, cubehelix, differenceCiede2000, formatHex, interpolate, Lch } from "culori"
import React, { useMemo } from "react"
import { css } from "../../../helpers/css"

const rotations = 0.2 // Number of rotations through the rainbow
const start = 0.04

// accent
const offset = 0.5
const stretch = 1

const stretchEnd = (t: number, f: number) => t / f + (1 - 1 / f)

function cube(
	t: number,
	args: {
		start: number
		rotations: number
		saturation: number
		lightness: number
	}
) {
	const { saturation: s, lightness: l, start, rotations } = args
	const hue = start + rotations * (1 - t)
	return cubehelix({ mode: "cubehelix", h: hue * 360, s: s, l: l, alpha: 1 })
}

const colorScheme = (scale: (i: number) => Cubehelix | Lch, n = 6) => {
	return Array.from({ length: n }, (_, i) => formatHex(scale((n - 1 - i) / (n - 1))))
}

const lightBackgroundCubehelixColors = colorScheme((i: number) =>
	cube(i, {
		start,
		rotations,
		saturation: 0.2 - 0.2 * (1 - i),
		lightness: stretchEnd(i, 5.5),
	})
)

const darkBackgroundCubeHelixColors = colorScheme((i: number) =>
	cube(i, {
		start,
		rotations,
		saturation: 0.1 - 0.05 * (1 - i),
		// lightness: (1 - i) / 2.5,
		lightness: Math.pow(1 - i, 0.6) / 2.5,
	})
)

const interp = (i: number, min: number, max: number) => min + (max - min) * i

const lightAccentCubehelixColors = colorScheme((i: number) =>
	cube(i, {
		start: start,
		rotations: rotations,
		saturation: 0.6 + interp(1 - i, 0, 0.4),
		lightness: 0.8 - interp(1 - i, 0, 0.1),
	})
)

const darkAccentCubehelixColors = colorScheme((i: number) =>
	cube(i, {
		start: start,
		rotations: rotations,
		saturation: 0.4 + interp(1 - i, 0, 0.6),
		lightness: 0.4 + interp(1 - i, 0, 0.2),
	})
)

const lightPrimaryCubehelixColors = colorScheme((i: number) =>
	cube(i, {
		start: start + offset,
		rotations: rotations * stretch,
		saturation: 1,
		lightness: 0.5,
	})
)

const darkPrimaryCubehelixColors = colorScheme((i: number) =>
	cube(i, {
		start: start + offset,
		rotations: rotations * stretch,
		saturation: 1,
		lightness: 0.5 + (1 - i) * 0.2,
	})
)

const whiteToBlackColors = colorScheme(
	(i: number) => interpolate(["#000000", "#ffffff"], "lch")(i),
	7
).slice(0, -3)

const blackToWhiteColors = colorScheme(
	(i: number) => interpolate(["#ffffff", "#000000"], "lch")(i),
	4
)

// LAYER_EXAMPLE: {
// 	// for (let i = 11; i >= 0; i--) {
// 	for (let i = 0; i < n; i++) {
// 		const color = lightBackgroundCubehelixColors[i + 1]

// 		const selector = Array(i + 1)
// 			.fill(".layer")
// 			.join(" ")

// 		css(`${selector} { background-color: ${color}; }`)
// 	}
// }

type Theme = {
	background: string[]
	foreground: string[]
	ibackground: string[]
	iforeground: string[]
	primary: string[]
	accent: string[]
	black: string[]
	white: string[]
}

const shiftTheme = (theme: Theme) => {
	return {
		...theme,
		background: theme.background.slice(1),
		ibackground: theme.ibackground.slice(1),
		primary: theme.primary.slice(1),
		accent: theme.accent.slice(1),
	}
}

const lightTheme: Theme = {
	background: lightBackgroundCubehelixColors,
	foreground: blackToWhiteColors,
	ibackground: darkBackgroundCubeHelixColors,
	iforeground: whiteToBlackColors,
	primary: lightPrimaryCubehelixColors,
	accent: lightAccentCubehelixColors,
	black: blackToWhiteColors,
	white: whiteToBlackColors,
}
const darkTheme: Theme = {
	background: darkBackgroundCubeHelixColors,
	foreground: whiteToBlackColors,
	ibackground: lightBackgroundCubehelixColors,
	iforeground: blackToWhiteColors,
	primary: darkPrimaryCubehelixColors,
	accent: darkAccentCubehelixColors,
	black: blackToWhiteColors,
	white: whiteToBlackColors,
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
	const s = 400
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

		css(`
			.${className} button:focus,
			.${className} input:focus,
			.${className} div:focus {
				outline: 2px solid ${theme.accent[0]};
				outline-offset: -1px;
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
			<div style={{ display: "flex", flexDirection: "row", gap: 4, alignItems: "center" }}>
				<h3 style={{ margin: 0 }}>Welcome to the form</h3>
				<div style={{ flex: 1 }} />
				<div
					style={{
						textAlign: "right",
						background: theme.accent[0],
						padding: "4px 6px",
						borderRadius: 4,
						fontSize: 12,
					}}
				>
					BETA
				</div>
			</div>

			{/* <p style={{ marginTop: 6, marginBottom: 6 }}>Please sign up.</p> */}
			{/* <div>
				<strong>Name:</strong>
			</div> */}
			<input placeholder="John Doe" style={{ ...reset, background: b2 }} />
			{/* <div>
				<strong>Email:</strong>
			</div>
			<input placeholder="john@doe.com" style={{ ...reset, background: b2 }} /> */}
			<div>
				<button style={{ ...reset, background: theme.primary[0], color: theme.white[0] }}>
					Sign up
				</button>
			</div>
		</div>
	)
}

export function ColorTheme(props: { name: string; theme: Theme }) {
	const { name, theme } = props
	return (
		<div style={{ display: "flex", flexDirection: "row", gap: 4 }}>
			<div style={{ display: "flex", flexDirection: "column", gap: 0, margin: 4 }}>
				<div style={{ fontSize: 22, fontWeight: "bold" }}>{name}</div>
				<div>Background</div>
				<SwatchList colors={theme.background} />
				<div>Foreground</div>
				<SwatchList colors={theme.foreground} />
				<div>Primary</div>
				<SwatchList colors={theme.primary} />
				<div>Accent</div>
				<SwatchList colors={theme.accent} />
			</div>
			<SwatchPyramid colors={theme.background} />
			<div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
				<FormExample theme={theme} />
				<FormExample theme={shiftTheme(theme)} />
				<FormExample theme={shiftTheme(shiftTheme(theme))} />
				<FormExample theme={shiftTheme(shiftTheme(shiftTheme(theme)))} />
			</div>
		</div>
	)
}

export function ColorsDemo() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 0, margin: 12 }}>
			<ColorTheme name="Light" theme={lightTheme} />
			<ColorTheme name="Dark" theme={darkTheme} />

			<div style={{ display: "flex", flexDirection: "column", gap: 0, margin: 4 }}>
				<div>Black</div>
				<SwatchList colors={lightTheme.black} />
				<div>White</div>
				<SwatchList colors={lightTheme.white} />
			</div>
		</div>
	)
}
