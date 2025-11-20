import { deleteAuth } from "database/auth"
import type { Request, Response } from "express"
import * as t from "shared/DataType"
import { TupleDb } from "tupledb/types"
import { clearAuthCookies, getAuthTokenCookie } from "../server"

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
	deleteAuth(db, authTokenId)
}
