import * as t from "data-type-ts"
import type { Request, Response } from "express"
import { query } from "../../shared/database/Query"
import type { ServerEnvironment } from "../services/ServerEnvironment"

// TODO: request validation.
export const input = t.any

export async function handler(
	environment: ServerEnvironment,
	args: { query: string },
	req: Request,
	res: Response
) {
	return query(environment, args)
}
