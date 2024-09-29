import * as t from "data-type-ts"
import type { Request, Response } from "express"
import type { ServerEnvironment } from "../services/ServerEnvironment"

// TODO: request validation.
export const input = t.any

export async function handler(
	environment: ServerEnvironment,
	args: t.Infer<typeof input>,
	req: Request,
	res: Response
) {
	const { db } = environment
	const [fn, ...fnArgs] = args
	const result = await db[fn](...fnArgs)
	return result
}
