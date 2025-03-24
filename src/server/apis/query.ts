import * as t from "data-type-ts"
import type { Request, Response } from "express"
import { queryNodeVm } from "../../shared/database/QueryNodeVm"
import type { ServerEnvironment } from "../services/ServerEnvironment"

// TODO: request validation.
export const input = t.any

export async function handler(
	environment: ServerEnvironment,
	args: { query: string },
	req: Request,
	res: Response
) {
	return queryNodeVm(environment, args.query)
}
