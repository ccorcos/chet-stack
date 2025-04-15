import type { Request, Response } from "express"
import { queryNodeVm } from "../../shared/database/QueryNodeVm"
import * as t from "../../shared/DataType"
import type { ServerEnvironment } from "../services/ServerEnvironment"

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
