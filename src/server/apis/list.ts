import type { Request, Response } from "express"
import { ListArgs } from "shared/database/types"
import * as t from "shared/DataType"
import type { ServerEnvironment } from "../services/ServerEnvironment"

// TODO: request validation.
export const input = t.any

export async function handler(
	environment: ServerEnvironment,
	args: ListArgs<any[]>,
	req: Request,
	res: Response
) {
	const { db } = environment
	return db.list(args)
}
