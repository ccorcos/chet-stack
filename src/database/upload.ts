import { ConflictError } from "shared/errors"
import { TupleDb } from "tupledb/types"
import type { Upload } from "./schema"

export function createUpload(db: TupleDb, upload: Upload) {
	if (db.get(["upload/id", upload.id]))
		throw new ConflictError(`Upload already exists: ${upload.id}`)

	db.set(["upload/id", upload.id], upload)
}

export function getUpload(db: TupleDb, id: string) {
	return db.get(["upload/id", id]) as Upload | undefined
}
