import React from "react"

import { darkTheme, lightTheme, shiftTheme, Theme } from "../../../../shared/colors"
import { css } from "../../../helpers/css"
import { ContentLayout, Layout, LeftPanelLayout } from "../Layout"

const themeVars = (theme: Theme) => {
	return [
		theme.background.map((c, i) => `--bg${i}: ${c};`).join("\n"),
		theme.foreground.map((c, i) => `--fg${i}: ${c};`).join("\n"),
		theme.ibackground.map((c, i) => `--ibg${i}: ${c};`).join("\n"),
		theme.iforeground.map((c, i) => `--ifg${i}: ${c};`).join("\n"),
		theme.primary.map((c, i) => `--primary${i}: ${c};`).join("\n"),
		theme.accent.map((c, i) => `--accent${i}: ${c};`).join("\n"),
		theme.black.map((c, i) => `--black${i}: ${c};`).join("\n"),
		theme.white.map((c, i) => `--white${i}: ${c};`).join("\n"),
	].join("\n")
}

// Explicit light / dark mode
css(`
.colorlight {
	${themeVars(lightTheme)}
	color-scheme: light;
}
`)

css(`
.colordark {
	${themeVars(darkTheme)}
	color-scheme: dark;
}
`)

css(`
.theme input,
.theme button {
	color: var(--fg0);
	background-color: var(--bg1);
}
`)

css(`
	.theme button:focus,
	.theme input:focus,
	.theme div:focus {
		outline: 2px solid var(--accent0);
		outline-offset: -1px;
	}
`)

css(`
.theme input::placeholder {
	color: var(--fg2);
}
`)

// TODO: layering system so that colors shift as we ascend layers.

LAYER_EXAMPLE: {
	function cssLayers(selector: string, theme: Theme) {
		const maxLayers = 4
		for (let i = 1; i < maxLayers; i++) {
			for (let j = 0; j < i; j++) theme = shiftTheme(theme)

			const s = `${selector} ${Array(i).fill(".layer").join(" ")}`
			css(`
				${s} {
					${themeVars(theme)}
					color: var(--fg0);
					background-color: var(--bg0);
				}
			`)
		}
	}

	cssLayers(".colorlight", lightTheme)
	cssLayers(".colordark", darkTheme)
}

export function ColorsExampleDemo() {
	return (
		<Layout
			className="colordark theme"
			style={{ background: "var(--bg0)", color: "var(--fg0)" }}
			LeftPanel={
				<LeftPanelLayout
					className="layer"
					show={true}
					style={{ display: "flex", flexDirection: "column", gap: 4, padding: 8 }}
				>
					<input placeholder="Search..." style={{ border: "none", borderRadius: 4, padding: 4 }} />
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<div style={{ padding: "4px 6px", borderRadius: 4 }}>Apples</div>
						<div style={{ padding: "4px 6px", borderRadius: 4 }}>Oranges</div>
						<div style={{ padding: "4px 6px", borderRadius: 4, background: "var(--accent0)" }}>
							Bananas
						</div>
						<div style={{ padding: "4px 6px", borderRadius: 4 }}>Pineapples</div>
						<div style={{ padding: "4px 6px", borderRadius: 4 }}>Strawberries</div>
						<div style={{ padding: "4px 6px", borderRadius: 4 }}>Cherries</div>
						<div style={{ padding: "4px 6px", borderRadius: 4 }}>Pears</div>
						<div style={{ padding: "4px 6px", borderRadius: 4 }}>Peaches</div>
					</div>
				</LeftPanelLayout>
			}
		>
			<ContentLayout style={{ background: "var(--bg0)", padding: 8 }}>
				<input style={{ border: "none", borderRadius: 4, padding: 4 }} />
				<div>Hello world!</div>
			</ContentLayout>
		</Layout>
	)
}
