/*

This API is a template.

*/

import { getCurrentUser } from "auth/server"
import type { Request, Response } from "express"
import * as t from "shared/DataType"
import type { ServerEnvironment } from "../services/ServerEnvironment"

// Used for request validation.
export const input = t.object({ message: t.string })

// It's helpful to be able to call this api functionality internally so we definite a separate
// function that isn't the API request handler.
export async function hello(username: string | undefined, message: string) {
	return { message: `Hello ${username ?? "Anonymous"}! Thanks for saying ${message}.` }
}

// This is the actual HTTP request handler. You can call this API from the client with:
// environment.api.hello({name: "World"})
export async function handler(
	environment: ServerEnvironment,
	args: t.InferType<typeof input>,
	req: Request,
	res: Response
) {
	const user = getCurrentUser(environment, req)
	return hello(user?.username, args.message)
}
