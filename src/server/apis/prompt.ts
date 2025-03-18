/*

This API is a template.

*/

import * as t from "data-type-ts"
import type { Request, Response } from "express"
import { recurPromptClaude } from "../helpers/gpt"
import type { ServerEnvironment } from "../services/ServerEnvironment"

// Used for request validation.
export const input = t.object({ system: t.string, prompts: t.array(t.string) })

export async function handler(
	environment: ServerEnvironment,
	args: t.Infer<typeof input>,
	req: Request,
	res: Response
) {
	return recurPromptClaude(args.system, args.prompts)
}
