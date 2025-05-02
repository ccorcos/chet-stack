export function inspect(value: any) {
	if (typeof value === "object" && value !== null) {
		// Check for circular references
		const seen = new Set()
		return JSON.stringify(
			value,
			(k, v) => {
				if (seen.has(v)) {
					return "[Circular]"
				}
				seen.add(v)
				return v
			},
			2
		)
	} else {
		return JSON.stringify(value)
	}
}
