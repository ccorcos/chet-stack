import { TupleDb } from "tupledb/types"

export type UploadSignatureData = {
	method: "get" | "put"
	id: string
	filename: string
	expirationMs: number
}

export type UploadConfig = {
	uploadKey: Buffer
	baseUrl: string
}

export type UploadEnvironment = {
	db: TupleDb
	config: UploadConfig
}
