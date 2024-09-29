import * as t from "data-type-ts"
import type { Request, Response } from "express"
import { ToFnCall } from "../../shared/fnCall"
import { DatabaseApi } from "../services/Database"
import type { ServerEnvironment } from "../services/ServerEnvironment"

// TODO: request validation.
export const input = t.any

type Input = ToFnCall<DatabaseApi>

export async function handler(
	environment: ServerEnvironment,
	args: Input, // t.Infer<typeof input>,
	req: Request,
	res: Response
) {
	const { db } = environment
	const [fn, ...fnArgs] = args as any
	const result = await db[fn](...fnArgs)
	return result
}
