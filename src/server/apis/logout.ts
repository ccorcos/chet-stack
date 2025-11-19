import { clearAuthCookies, getAuthTokenCookie } from "auth/auth"
import { deleteAuthToken } from "database/authToken"
import type { Request, Response } from "express"
import * as t from "shared/DataType"
import { TupleDb } from "tupledb/types"

export const input = t.any

export async function handler(
	environment: { db: TupleDb },
	args: t.InferType<typeof input>,
	req: Request,
	res: Response
) {
	const { db } = environment
	const authTokenId = getAuthTokenCookie(req)
	if (!authTokenId) return
	clearAuthCookies(res)
	deleteAuthToken(db, authTokenId)
}
