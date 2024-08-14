import type { Request, Response } from "express"
import * as t from "../../shared/dataTypes"
import type { ServerEnvironment } from "../services/ServerEnvironment"

export const input = t.object({})

// The actual api method.
export async function handler(
	environment: ServerEnvironment,
	args: t.Infer<typeof input>,
	req: Request,
	res: Response
) {
	const authTokenId = req.cookies.authToken
	if (!authTokenId) return
	res.clearCookie("authToken")
	res.clearCookie("userId")
	await environment.db.deleteAuthToken(authTokenId)
}
