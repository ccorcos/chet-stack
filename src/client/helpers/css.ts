export function css(statement: string): void {
	const styleId = "dynamic-custom-app-styles"
	let styleEl = document.getElementById(styleId) as HTMLStyleElement | null

	if (!styleEl) {
		styleEl = document.createElement("style")
		styleEl.id = styleId
		document.head.appendChild(styleEl)
	}

	console.log(statement)
	styleEl.sheet?.insertRule(statement.trim(), styleEl.sheet.cssRules.length)
}

// Add a hover state for the custom class
// css(`
//     .layer {background-color: #2980b9;}
//   `)
