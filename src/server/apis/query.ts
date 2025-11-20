import type { Request, Response } from "express"
import * as t from "shared/DataType"
import { queryNodeVm } from "tupledb/QueryNodeVm"
import type { ServerEnvironment } from "../ServerEnvironment"

// TODO: request validation.
export const input = t.any

export async function handler(
	environment: ServerEnvironment,
	args: { query: string },
	req: Request,
	res: Response
) {
	return queryNodeVm(environment.db, args.query)
}
