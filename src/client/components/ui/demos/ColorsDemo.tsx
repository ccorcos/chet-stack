import { differenceCiede2000 } from "culori"
import React, { useMemo } from "react"
import { darkTheme, lightTheme, shiftTheme, Theme } from "../../../../shared/colors"
import { css } from "../../../helpers/css"

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
