import { cubehelix, formatHex, interpolate } from "culori"

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

export const whiteCubehelixColors = Array.from({ length: 12 }, (_, i) =>
	formatHex(cubehelixScale((11 - i) / 11))
)

// 12 white-to-blue colors (perceptual interpolation)
const whiteToBlue = interpolate(["#ffffff", "rgba(0, 122, 255, 1)"], "lch")
const whiteBlueColors = Array.from({ length: 12 }, (_, i) => formatHex(whiteToBlue(i / 11 / 2)))
