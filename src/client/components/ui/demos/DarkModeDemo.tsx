// /* Shared defaults */
// :root {
//   --font: system-ui;
//   --border-radius: 4px;
//   /* no color variables here */
// }

import React, { useEffect, useState } from "react"
import { css } from "../../../helpers/css"
import { ComboBoxSelect } from "../ComboBox"

css(`
:root {
	--demobackground: white;
	--democolor: black;
	color-scheme: light;
}
`)

css(`
@media (prefers-color-scheme: dark) {
	:root {
		--demobackground: black;
		--democolor: white;
		color-scheme: dark;
	}
}
`)

// Explicit light / dark mode
css(`
html.demolight {
	--demobackground: white;
	--democolor: black;
	color-scheme: light;
}
`)

css(`
html.demodark {
	--demobackground: black;
	--democolor: white;
	color-scheme: dark;
}
`)

// Light / dark mode just for specific elements.
css(`
.demolight {
	--demobackground: white;
	--democolor: black;
}
`)

css(`
.demodark {
	--demobackground: black;
	--democolor: white;
}
`)

type Mode = "auto" | "light" | "dark"
const modes: Mode[] = ["auto", "light", "dark"]
export function DarkModeDemo() {
	const [globalMode, setGlobalMode] = useState<Mode>("auto")
	const [localMode, setLocalMode] = useState<Mode>("auto")
	useEffect(() => {
		if (globalMode === "auto") {
			document.documentElement.classList.remove("demolight", "demodark")
		} else if (globalMode === "light") {
			document.documentElement.classList.remove("demodark")
			document.documentElement.classList.add("demolight")
		} else if (globalMode === "dark") {
			document.documentElement.classList.remove("demolight")
			document.documentElement.classList.add("demodark")
		}
	}, [globalMode])

	return (
		<div>
			<h1>DarkModeDemo</h1>

			<div>Global Dark Mode</div>
			<ComboBoxSelect
				items={modes}
				value={globalMode}
				onChange={setGlobalMode}
				placeholder="Select mode..."
			/>
			<div style={{ background: "var(--demobackground)", color: "var(--democolor)" }}>
				Hello world
			</div>

			<div>Local Dark Mode</div>
			<ComboBoxSelect
				items={modes}
				value={localMode}
				onChange={setLocalMode}
				placeholder="Select mode..."
			/>
			<div
				className={"demo" + localMode}
				style={{ background: "var(--demobackground)", color: "var(--democolor)" }}
			>
				Hello world
			</div>
		</div>
	)
}
