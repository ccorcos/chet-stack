import { execSync } from "child_process"
import { writeFileSync } from "fs"
import { Theme, darkTheme, lightTheme, shiftTheme } from "../shared/colors"

const themeVars = (theme: Theme) =>
	Object.keys(theme)
		.map((key) => {
			const color = theme[key]
			return color.map((c, i) => `--${key}${i}: ${c};`).join("\n")
		})
		.join("\n")

const light = {
	shadow:
		"rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px, rgba(15, 15, 15, 0.2) 0px 9px 24px;",
	highlight: "color-mix(in srgb, var(--accent0) 40%, var(--bg1) 60%)",
	border: "rgba(0, 0, 18, 0.1)",
}

const dark = {
	shadow:
		"rgba(255, 255, 255, 0.2) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px, rgba(15, 15, 15, 0.2) 0px 9px 24px;",
	highlight: "color-mix(in srgb, var(--accent0) 50%, var(--bg1) 50%)",
	border: "rgba(243, 243, 255, 0.1)",
}

const extraVars = (obj: Record<string, string>) =>
	Object.keys(obj)
		.map((key) => `--${key}: ${obj[key]};`)
		.join("\n")

let themeCss = `

/* WARNING: This is a generated file. Do not edit directly. */

/* Auto light theme */
:root {
	${themeVars(lightTheme)}
	${extraVars(light)}
	color-scheme: light;
}

/* Auto dark theme */
@media (prefers-color-scheme: dark) {
	:root {
		${themeVars(darkTheme)}
		${extraVars(dark)}
		color-scheme: dark;
	}
}

/* Explicit light theme */
.light {
	${themeVars(lightTheme)}
	${extraVars(light)}
	color-scheme: light;
}

/* Explicit dark theme */
.dark {
	${themeVars(darkTheme)}
	${extraVars(dark)}
	color-scheme: dark;
}

`

let layersCss = ""
const maxLayers = 4
for (let i = 1; i < maxLayers; i++) {
	let light = { ...lightTheme }
	let dark = { ...darkTheme }
	for (let j = 0; j < i; j++) {
		dark = shiftTheme(dark)
		light = shiftTheme(light)
	}
	const selector = `${Array(i).fill(".layer").join(" ")}`
	layersCss += `
		${selector} {
			${themeVars(light)}
		}

		@media (prefers-color-scheme: dark) {
			:root {
				${themeVars(dark)}
			}
		}

		.light ${selector} {
			${themeVars(light)}
		}

		.dark ${selector} {
			${themeVars(dark)}
		}
	`
}

themeCss += layersCss

writeFileSync(__dirname + "/theme.css", themeCss)
execSync(`npx prettier --write ${__dirname + "/theme.css"}`)

// const oldLightTheme = `
// 	/* Started with Apple variables */
// 	/* https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/dark-mode */
// 	/* https://sarunw.com/posts/dark-color-cheat-sheet/#background-color */
// 	--background: rgba(255, 255, 255, 1);
// 	--background2: rgba(242, 242, 247, 1);
// 	--background3: rgba(255, 255, 255, 1);

// 	--transparent1: rgba(0, 0, 18, 0.1);
// 	--transparent2: rgba(0, 0, 18, 0.2);
// 	--transparent3: rgba(0, 0, 18, 0.3);
// 	--transparent4: rgba(0, 0, 18, 0.4);

// 	--text-color: rgba(0, 0, 0, 1);
// 	--text-color2: rgba(61, 61, 66, 0.6);
// 	--text-color3: rgba(61, 61, 66, 0.3);
// 	--text-color4: rgba(61, 61, 66, 0.18);

// 	--placeholder: rgba(61, 61, 66, 0.3);
// 	--separator: rgba(61, 61, 66, 0.29);
// 	--separator-opaque: rgba(199, 199, 199, 1);

// 	--blue: rgba(0, 122, 255, 1);
// 	--green: rgba(51, 199, 89, 1);
// 	--indigo: rgba(89, 87, 214, 1);
// 	--orange: rgba(255, 148, 0, 1);
// 	--pink: rgba(255, 46, 84, 1);
// 	--purple: rgba(176, 82, 222, 1);
// 	--red: rgba(255, 59, 48, 1);
// 	--teal: rgba(89, 199, 250, 1);
// 	--yellow: rgba(255, 204, 0, 1);
// 	--gray: rgba(143, 143, 148, 1);
// 	--gray2: rgba(173, 173, 179, 1);
// 	--gray3: rgba(199, 199, 204, 1);
// 	--gray4: rgba(209, 209, 214, 1);
// 	--gray5: rgba(230, 230, 235, 1);
// 	--gray6: rgba(242, 242, 247, 1);

// 	/* App Variables */
// 	--popup-background: var(--background);
// 	--shadow: rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px,
// 		rgba(15, 15, 15, 0.2) 0px 9px 24px;

// 	/* --highlight: rgba(0, 122, 255, 0.5); */
// 	--highlight: color-mix(in srgb, var(--blue) 50%, var(--background) 50%);

// 	/* --highlight2: rgba(0, 122, 255, 0.3); */
// 	--highlight2: color-mix(in srgb, var(--blue) 30%, var(--background) 70%);
// `

// const oldDarkTheme = `
// 	/* Apple Variables */
// 	--background: rgba(0, 0, 0, 1);
// 	--background2: rgb(36, 36, 40);
// 	--background3: rgb(48, 48, 52);

// 	--transparent1: rgba(243, 243, 255, 0.1);
// 	--transparent2: rgba(243, 243, 255, 0.2);
// 	--transparent3: rgba(243, 243, 255, 0.3);
// 	--transparent4: rgba(243, 243, 255, 0.4);

// 	--text-color: rgba(255, 255, 255, 1);
// 	--text-color2: rgba(235, 235, 245, 0.6);
// 	--text-color3: rgba(235, 235, 245, 0.3);
// 	--text-color4: rgba(235, 235, 245, 0.18);

// 	--placeholder: rgba(235, 235, 245, 0.3);
// 	--separator: rgba(84, 84, 89, 0.6);
// 	--separator-opaque: rgba(56, 56, 59, 1);

// 	--blue: rgba(10, 133, 255, 1);
// 	--green: rgba(48, 209, 89, 1);
// 	--indigo: rgba(94, 92, 230, 1);
// 	--orange: rgba(255, 158, 10, 1);
// 	--pink: rgba(255, 56, 94, 1);
// 	--purple: rgba(191, 89, 242, 1);
// 	--red: rgba(255, 69, 59, 1);
// 	--teal: rgba(99, 209, 255, 1);
// 	--yellow: rgba(255, 214, 10, 1);
// 	--gray: rgba(143, 143, 148, 1);
// 	--gray2: rgba(99, 99, 102, 1);
// 	--gray3: rgba(71, 71, 74, 1);
// 	--gray4: rgba(59, 59, 61, 1);
// 	--gray5: rgba(43, 43, 46, 1);
// 	--gray6: rgba(28, 28, 31, 1);

// 	/* App Variables */
// 	--popup-background: var(--background2);
// 	--shadow: rgba(255, 255, 255, 0.2) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px,
// 		rgba(15, 15, 15, 0.2) 0px 9px 24px;

// 	/* --highlight: rgba(0, 122, 255, 0.5); */
// 	--highlight: color-mix(in srgb, var(--blue) 50%, var(--background) 50%);

// 	/* --highlight2: rgba(0, 122, 255, 0.3); */
// 	--highlight2: color-mix(in srgb, var(--blue) 30%, var(--background) 70%);
// `
