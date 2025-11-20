import { getCurrentUserId } from "auth/server"
import { Upload } from "database/schema"
import { createUpload } from "database/upload"
import type { Request } from "express"
import type { ServerEnvironment } from "server/ServerEnvironment"
import * as t from "shared/DataType"
import { HourMs } from "shared/dateHelpers"
import { PermissionError } from "shared/errors"
import { tupleTx } from "tupledb/TupleDb"
import { normalizeFilename } from "../fileHelpers"
import { createSignature } from "../signatureHelpers"
import { UploadEnvironment, UploadSignatureData } from "../types"

export const input = t.object({
	files: t.array(
		t.object({
			id: t.uuid, // Random generated id by the client.
			filename: t.string,
		})
	),
})

export async function getUploadUrls(
	environment: UploadEnvironment,
	args: t.InferType<typeof input>,
	userId: string
) {
	const { db, config } = environment

	const uploads: Upload[] = args.files.map((file) => ({
		id: file.id,
		filename: normalizeFilename(file.filename),
		createdAt: new Date().toISOString(),
		userId,
	}))

	const tx = tupleTx(db)
	for (const upload of uploads) createUpload(tx, upload)
	tx.commit()

	const secretKey = config.uploadKey

	const urls: { [id: string]: string } = {}
	for (const { id, filename } of uploads) {
		const expirationMs = Date.now() + HourMs
		const data: UploadSignatureData = { method: "put", id, filename, expirationMs }
		const signature = createSignature({ data, secretKey })
		const url = new URL(`${config.baseUrl}/uploads/${id}/${filename}`)
		url.searchParams.set("expiration", expirationMs.toString())
		url.searchParams.set("signature", signature)
		urls[id] = url.toString()
	}
	return { uploads, urls }
}

export async function handler(
	environment: ServerEnvironment,
	args: t.InferType<typeof input>,
	req: Request
) {
	const userId = await getCurrentUserId(environment, req)
	if (!userId) throw new PermissionError("You need to be logged in to upload files.")
	return getUploadUrls(environment, args, userId)
}
