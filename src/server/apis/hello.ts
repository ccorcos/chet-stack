/*

This api isn't expected to be used, but is here for demonstration purposes.

*/

import * as t from "data-type-ts"
import type { Request } from "express"
import { BrokenError, PermissionError } from "../../shared/errors"
import { getCurrentUserId } from "../helpers/getCurrentUserId"
import type { ServerEnvironment } from "../services/ServerEnvironment"

export const input = t.object({
	prefix: t.string,
})

export async function hello(
	environment: ServerEnvironment,
	args: t.Infer<typeof input>,
	userId: string
) {
	const user = await environment.db.getRecord({ table: "user", id: userId })
	if (!user) throw new BrokenError(`User does not exist: ${userId}`)
	return { message: `Hello ${args.prefix} ${user.username}!` }
}

export async function handler(
	environment: ServerEnvironment,
	args: t.Infer<typeof input>,
	req: Request
) {
	const userId = await getCurrentUserId(environment, req)
	if (!userId) throw new PermissionError("You need to be logged in.")
	return hello(environment, args, userId)
}
