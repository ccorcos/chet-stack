import type { Request } from "express"
import * as t from "shared/DataType"
// import { getCurrentUserId } from "../helpers/getCurrentUserId"
import type { ServerEnvironment } from "../services/ServerEnvironment"

export const input = t.object({
	fileIds: t.array(t.uuid),
})

export async function getSignedFileUrls(
	environment: ServerEnvironment,
	args: { fileIds: string[] },
	userId: string
) {
	// const pointers: RecordPointer<"file">[] = args.fileIds.map((id) => ({ table: "file", id }))
	// const recordMap = await loadRecordsWithPermissionRecords(environment, pointers)
	// filterRecordMapForPermission(recordMap, userId)
	// const urls: { [fileId: string]: string | null } = {}
	// const expirationMs = Date.now() + HourMs
	// const secretKey = environment.config.signatureSecret
	// for (const id of args.fileIds) {
	// 	const record = getRecordMap(recordMap, { table: "file", id })
	// 	if (!record) {
	// 		urls[id] = null
	// 		continue
	// 	}
	// 	const filename = record.filename
	// 	const data: FileSignatureData = { method: "get", id, filename, expirationMs }
	// 	const signature = createSignature({ data, secretKey })
	// 	const url = new URL(`${environment.config.baseUrl}/uploads/${id}/${filename}`)
	// 	url.searchParams.set("expiration", expirationMs.toString())
	// 	url.searchParams.set("signature", signature)
	// 	urls[id] = url.toString()
	// }
	// return { urls, recordMap }
}

export async function handler(
	environment: ServerEnvironment,
	args: { fileIds: string[] },
	req: Request
) {
	// const userId = await getCurrentUserId(environment, req)
	// if (!userId) throw new PermissionError("You need to be logged in.")
	// return getSignedFileUrls(environment, args, userId)
}
