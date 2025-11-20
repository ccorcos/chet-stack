import { createSignature } from "./signatureHelpers"
import { UploadConfig, UploadSignatureData } from "./types"

export function normalizeFilename(filename: string) {
	// Replace non-alphanumeric stuff with _.
	filename = filename.replace(/[^a-zA-Z0-9\s\-_\.]+/g, "_")

	// Lowercase extension because that gets annoying.
	const [ext, ...rest] = filename.split(".").reverse()
	filename = [...rest.reverse(), ext.toLowerCase()].join(".")

	return filename
}

export async function getSignedFileUrl(config: UploadConfig, data: UploadSignatureData) {
	const { uploadKey: uploadsKey, baseUrl } = config

	const { id, filename, expirationMs } = data
	const signature = createSignature({ data, secretKey: uploadsKey })

	const url = new URL(`${baseUrl}/uploads/${id}/${filename}`)
	url.searchParams.set("expiration", expirationMs.toString())
	url.searchParams.set("signature", signature)
	return url
}
