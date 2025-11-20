import { getCurrentUserId } from "auth/server"
import { Upload } from "database/schema"
import { getUpload } from "database/upload"
import type { Request } from "express"
import type { ServerEnvironment } from "server/ServerEnvironment"
import * as t from "shared/DataType"
import { HourMs } from "shared/dateHelpers"
import { PermissionError } from "shared/errors"
import { createSignature } from "../signatureHelpers"
import { UploadEnvironment, UploadSignatureData } from "../types"

export const input = t.object({
	fileIds: t.array(t.uuid),
})

export async function getDownloadUrls(
	environment: UploadEnvironment,
	args: { fileIds: string[] },
	userId: string
) {
	const uploads = args.fileIds
		.map((id) => getUpload(environment.db, id))
		.filter((upload) => upload?.userId === userId) as Upload[]

	const urls: { [fileId: string]: string } = {}
	const expirationMs = Date.now() + HourMs
	const secretKey = environment.config.uploadKey
	for (const upload of uploads) {
		const { id, filename } = upload
		const data: UploadSignatureData = { method: "get", id, filename, expirationMs }
		const signature = createSignature({ data, secretKey })
		const url = new URL(`${environment.config.baseUrl}/uploads/${id}/${filename}`)
		url.searchParams.set("expiration", expirationMs.toString())
		url.searchParams.set("signature", signature)
		urls[id] = url.toString()
	}
	return { urls, uploads }
}

export async function handler(
	environment: ServerEnvironment,
	args: { fileIds: string[] },
	req: Request
) {
	const userId = await getCurrentUserId(environment, req)
	if (!userId) throw new PermissionError("You need to be logged in to download files.")
	return getDownloadUrls(environment, args, userId)
}
