export type FileSignatureData = {
	method: "get" | "put"
	id: string
	filename: string
	expirationMs: number
}

export function normalizeFilename(filename: string) {
	// Replace non-alphanumeric stuff with _.
	filename = filename.replace(/[^a-zA-Z0-9\s\-_\.]+/g, "_")

	// Lowercase extension because that gets annoying.
	const [ext, ...rest] = filename.split(".").reverse()
	filename = [...rest.reverse(), ext.toLowerCase()].join(".")

	return filename
}
