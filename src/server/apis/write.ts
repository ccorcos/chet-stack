import * as t from "data-type-ts"
import type { Request, Response } from "express"
import { Transaction } from "../../shared/database/types"
import type { ServerEnvironment } from "../services/ServerEnvironment"

// TODO: request validation.
export const input = t.any

export async function handler(
	environment: ServerEnvironment,
	args: Transaction<string, string>, // t.Infer<typeof input>,
	req: Request,
	res: Response
) {
	const { db } = environment
	return db.write(args)
}
