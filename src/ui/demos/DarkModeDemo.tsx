// /* Shared defaults */
// :root {
//   --font: system-ui;
//   --border-radius: 4px;
//   /* no color variables here */
// }

import { css } from "client/helpers/css"
import React, { useEffect, useState } from "react"
import { ComboBoxSelect } from "../components/ComboBox"

css(`
:root {
	--demobackground: white;
	--democolor: black;
}
`)

css(`
@media (prefers-color-scheme: dark) {
	:root {
		--demobackground: black;
		--democolor: white;
	}
}
`)

// Explicit light / dark mode
css(`
.demolight {
	--demobackground: white;
	--democolor: black;
	color-scheme: light;
}
`)

css(`
.demodark {
	--demobackground: black;
	--democolor: white;
	color-scheme: dark;
}
`)

type Mode = "auto" | "light" | "dark"
const modes: Mode[] = ["auto", "light", "dark"]
export function DarkModeDemo() {
	return (
		<div style={{ margin: 12 }}>
			<h1>DarkModeDemo</h1>
			<AppDarkModeDemo />
			<IsolatedDarkModeDemo />
		</div>
	)
}

function IsolatedDarkModeDemo() {
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
		<div style={{ border: "1px solid var(--border)", padding: 12 }}>
			<h3>Isolated Demo</h3>
			<div style={{ display: "flex", alignItems: "center" }}>
				<div style={{ width: 200 }}>Global Dark Mode</div>
				<ComboBoxSelect
					items={modes}
					value={globalMode}
					onChange={setGlobalMode}
					placeholder="Select mode..."
				/>
			</div>
			<div>
				<p>Hello world</p>
			</div>

			<div style={{ display: "flex", alignItems: "center" }}>
				<div style={{ width: 200 }}>Local Dark Mode</div>
				<ComboBoxSelect
					items={modes}
					value={localMode}
					onChange={setLocalMode}
					placeholder="Select mode..."
				/>
			</div>
			<div
				className={"demo" + localMode}
				style={{ background: "var(--demobackground)", color: "var(--democolor)" }}
			>
				<p>Hello world</p>
			</div>
		</div>
	)
}

function AppDarkModeDemo() {
	const [globalMode, setGlobalMode] = useState<Mode>("auto")
	const [localMode, setLocalMode] = useState<Mode>("auto")
	useEffect(() => {
		if (globalMode === "auto") {
			document.documentElement.classList.remove("light", "dark")
		} else if (globalMode === "light") {
			document.documentElement.classList.remove("dark")
			document.documentElement.classList.add("light")
		} else if (globalMode === "dark") {
			document.documentElement.classList.remove("light")
			document.documentElement.classList.add("dark")
		}
	}, [globalMode])

	return (
		<div style={{ border: "1px solid var(--border)", padding: 12 }}>
			<h3>App Demo</h3>
			<div style={{ display: "flex", alignItems: "center" }}>
				<div style={{ width: 200 }}>Global Dark Mode</div>
				<ComboBoxSelect
					items={modes}
					value={globalMode}
					onChange={setGlobalMode}
					placeholder="Select mode..."
				/>
			</div>
			<div>
				<p>Hello world</p>
			</div>

			<div style={{ display: "flex", alignItems: "center" }}>
				<div style={{ width: 200 }}>Local Dark Mode</div>
				<ComboBoxSelect
					items={modes}
					value={localMode}
					onChange={setLocalMode}
					placeholder="Select mode..."
				/>
			</div>
			<div
				className={localMode}
				style={{ background: "var(--demobackground)", color: "var(--democolor)" }}
			>
				<p>Hello world</p>
			</div>
		</div>
	)
}
