import * as t from "data-type-ts"
import type { Request, Response } from "express"
import { ListArgs } from "../../shared/database/types"
import type { ServerEnvironment } from "../services/ServerEnvironment"

// TODO: request validation.
export const input = t.any

export async function handler(
	environment: ServerEnvironment,
	args: ListArgs<string>,
	req: Request,
	res: Response
) {
	const { db } = environment
	return db.list(args)
}
