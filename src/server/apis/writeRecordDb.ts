import type { Request, Response } from "express"
import * as t from "shared/DataType"
import { applyRecordDbOperation, recordDb, RecordDbOperation } from "tupledb/RecordDb"
import { tupleDb, tupleTx } from "tupledb/TupleDb"
import type { ServerEnvironment } from "../ServerEnvironment"

// TODO: request validation.
export const input = t.object({
	subspace: t.optional(t.array(t.any)),
	operations: t.array(t.any as t.AnyDataType<RecordDbOperation>),
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
	for (const op of args.operations) applyRecordDbOperation(rdb, op)
	tx.commit()
}
