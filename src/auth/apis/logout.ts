import { deleteAuth } from "database/auth"
import type { Request, Response } from "express"
import * as t from "shared/DataType"
import { clearAuthCookies, getAuthTokenCookie } from "../server"
import { AuthEnvironment } from "./types"

export const input = t.any

export async function handler(
	environment: AuthEnvironment,
	args: t.InferType<typeof input>,
	req: Request,
	res: Response
) {
	const { db } = environment
	const authTokenId = getAuthTokenCookie(req)
	if (!authTokenId) return
	clearAuthCookies(res)
	deleteAuth(db, authTokenId)
}
