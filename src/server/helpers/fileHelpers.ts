import { createSignature } from "../helpers/signatureHelpers"
import { ServerConfig } from "../services/ServerConfig"

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

export async function getSignedFileUrl(
	environment: { config: ServerConfig },
	data: FileSignatureData
) {
	const secretKey = environment.config.signatureSecret

	const { id, filename, expirationMs } = data
	const signature = createSignature({ data, secretKey })

	const url = new URL(`${environment.config.baseUrl}/uploads/${id}/${filename}`)
	url.searchParams.set("expiration", expirationMs.toString())
	url.searchParams.set("signature", signature)
	return url
}
