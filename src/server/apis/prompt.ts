/*

This API is a template.

*/

import type { Request, Response } from "express"
import * as t from "shared/DataType"
import { promptLocal } from "../helpers/gptLocal"
import type { ServerEnvironment } from "../services/ServerEnvironment"

// Used for request validation.
export const input = t.object({ system: t.string, prompt: t.string })

export async function handler(
	environment: ServerEnvironment,
	args: t.InferType<typeof input>,
	req: Request,
	res: Response
) {
	return promptLocal(args.system, args.prompt)
}
