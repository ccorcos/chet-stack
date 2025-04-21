import type { Request, Response } from "express"
import { recordDb } from "../../shared/database/RecordDb"
import { tupleDb } from "../../shared/database/TupleDb"
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
	const tx = recordDb(tupleDb(db).subspace(args.subspace ?? []), "optional").transact()
	for (const record of args.delete ?? []) tx.deleteRecord(record)
	for (const record of args.set ?? []) tx.setRecord(record)
	tx.commit()
}
