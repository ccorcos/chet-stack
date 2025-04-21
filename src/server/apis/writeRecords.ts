import type { Request, Response } from "express"
import { recordDb } from "../../shared/database/RecordDb"
import { tupleDb, tupleTx } from "../../shared/database/TupleDb"
import * as t from "../../shared/DataType"
import type { ServerEnvironment } from "../services/ServerEnvironment"

// TODO: request validation.
export const input = t.object({
	subspace: t.optional(t.array(t.any)),
	set: t.optional(t.array(t.object({ table: t.string, id: t.string }, false))),
	delete: t.optional(t.array(t.object({ table: t.string, id: t.string }))),
})

export async function handler(
	environment: ServerEnvironment,
	args: t.InferType<typeof input>,
	req: Request,
	res: Response
) {
	const { db } = environment

	const tx = tupleTx(tupleDb(db).subspace(args.subspace ?? []))

	const rdb = recordDb(tx, "optional")
	for (const record of args.delete ?? []) rdb.deleteRecord(record)
	for (const record of args.set ?? []) rdb.setRecord(record)

	tx.commit()
}
