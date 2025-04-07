import { Cubehelix, cubehelix, formatHex, interpolate, Lch } from "culori"

// Number of rotations through the rainbow
const rotations = 0.2
const start = 0.04

// Accent color
const offset = 0.5
const stretch = 1

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

const stretchEnd = (t: number, f: number) => t / f + (1 - 1 / f)
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

export type Theme = {
	background: string[]
	foreground: string[]
	ibackground: string[]
	iforeground: string[]
	primary: string[]
	accent: string[]
	black: string[]
	white: string[]
}

export const lightTheme: Theme = {
	background: lightBackgroundCubehelixColors,
	foreground: blackToWhiteColors,
	ibackground: darkBackgroundCubeHelixColors,
	iforeground: whiteToBlackColors,
	primary: lightPrimaryCubehelixColors,
	accent: lightAccentCubehelixColors,
	black: blackToWhiteColors,
	white: whiteToBlackColors,
}

export const darkTheme: Theme = {
	background: darkBackgroundCubeHelixColors,
	foreground: whiteToBlackColors,
	ibackground: lightBackgroundCubehelixColors,
	iforeground: blackToWhiteColors,
	primary: darkPrimaryCubehelixColors,
	accent: darkAccentCubehelixColors,
	black: blackToWhiteColors,
	white: whiteToBlackColors,
}

export const shiftTheme = (theme: Theme) => {
	return {
		...theme,
		background: theme.background.slice(1),
		ibackground: theme.ibackground.slice(1),
		primary: theme.primary.slice(1),
		accent: theme.accent.slice(1),
	}
}
