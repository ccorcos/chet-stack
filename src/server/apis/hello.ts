/*

This API is a template.

*/

import type { Request, Response } from "express"
import * as t from "shared/DataType"
import type { ServerEnvironment } from "../services/ServerEnvironment"

// Used for request validation.
export const input = t.object({ name: t.string })

// It's helpful to be able to call this api functionality internally so we definite a separate
// function that isn't the API request handler.
export async function hello(name: string) {
	return { message: `Hello ${name}!` }
}

// This is the actual HTTP request handler. You can call this API from the client with:
// environment.api.hello({name: "World"})
export async function handler(
	environment: ServerEnvironment,
	args: t.InferType<typeof input>,
	req: Request,
	res: Response
) {
	return hello(args.name)
}
