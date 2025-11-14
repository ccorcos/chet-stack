import type { Request } from "express"
import * as t from "shared/DataType"
import type { ServerEnvironment } from "../services/ServerEnvironment"

export const input = t.object({
	files: t.array(
		t.object({
			id: t.uuid,
			filename: t.string,
		})
	),
})

export async function createUploadUrls(
	environment: ServerEnvironment,
	args: t.InferType<typeof input>,
	userId: string
) {
	// const files = args.files.map(({ id, filename }) => {
	// 	const record: FileRecord = {
	// 		id,
	// 		filename: normalizeFilename(filename),
	// 		version: 0,
	// 		created_at: new Date().toISOString(),
	// 		updated_at: new Date().toISOString(),
	// 		owner_id: userId,
	// 	}
	// 	return record
	// })
	// const tx: Transaction = {
	// 	txId: randomId(),
	// 	authorId: userId,
	// 	operations: args.files.map(({ id, filename }) =>
	// 		op.create("file", {
	// 			id,
	// 			version: 0,
	// 			created_at: new Date().toISOString(),
	// 			updated_at: new Date().toISOString(),
	// 			filename,
	// 			owner_id: userId,
	// 		})
	// 	),
	// }
	// await write(environment, tx)
	// const secretKey = environment.config.signatureSecret
	// const urls: { [id: string]: string } = {}
	// for (const { id, filename } of files) {
	// 	const expirationMs = Date.now() + HourMs
	// 	const data: FileSignatureData = { method: "put", id, filename, expirationMs }
	// 	const signature = createSignature({ data, secretKey })
	// 	const url = new URL(`${environment.config.baseUrl}/uploads/${id}/${filename}`)
	// 	url.searchParams.set("expiration", expirationMs.toString())
	// 	url.searchParams.set("signature", signature)
	// 	urls[id] = url.toString()
	// }
	// const recordMap: RecordMap = {}
	// for (const file of files) setRecordMap(recordMap, { table: "file", id: file.id }, file)
	// return { urls, recordMap }
}

export async function handler(
	environment: ServerEnvironment,
	args: t.InferType<typeof input>,
	req: Request
) {
	// const userId = await getCurrentUserId(environment, req)
	// if (!userId) throw new PermissionError("You need to be logged in.")
	// return createUploadUrls(environment, args, userId)
}
