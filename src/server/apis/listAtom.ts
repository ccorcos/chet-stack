import type { Request, Response } from "express"
import * as t from "shared/DataType"
import { QueryCache } from "tupledb/QueryCache"
import { tupleDb } from "tupledb/TupleDb"
import { ListArgs, Tuple } from "tupledb/types"
import type { ServerEnvironment } from "../ServerEnvironment"

// TODO: request validation.
export const input = t.any

export async function handler(
	environment: ServerEnvironment,
	args: {
		atomPath: Tuple
		listArgs: ListArgs<any[]>
	},
	req: Request,
	res: Response
) {
	const cache = new QueryCache(environment.db)

	const db = tupleDb(cache).subspace(args.atomPath)

	db.get(["clock"])
	db.list(args.listArgs)

	const data = cache.data.data
	const reads = cache.reads

	return { data, reads }
}
