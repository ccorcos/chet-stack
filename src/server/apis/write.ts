import type { Request, Response } from "express"
import * as t from "shared/DataType"
import { WriteArgs } from "tupledb/types"
import type { ServerEnvironment } from "../ServerEnvironment"

// TODO: request validation.
export const input = t.any

export async function handler(
	environment: ServerEnvironment,
	args: WriteArgs<any[], any>, // t.Infer<typeof input>,
	req: Request,
	res: Response
) {
	const { db } = environment
	return db.write(args)
}
