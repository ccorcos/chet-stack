import { getAuth } from "database/auth"
import { getUser } from "database/user"
import type { Request, Response } from "express"
import { scrypt } from "node:crypto"
import { BrokenError, PermissionError } from "shared/errors"
import { TupleDb } from "tupledb/types"

/**
 * Generate a passwordSalt for securely storing password hases.
 * > node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))'
 */
export async function getPasswordHash(args: { passwordSalt: Buffer; password: string }) {
	const { passwordSalt, password } = args
	const passwordHash = await new Promise<string>((resolve, reject) => {
		scrypt(password, passwordSalt, 64, (error, hash) => {
			if (error) return reject(error)
			else resolve(hash.toString("base64"))
		})
	})
	return passwordHash
}

export async function setAuthCookies(
	args: {
		userId: string
		authToken: string
		expires: Date
		secure: boolean
		domain: string | undefined
	},
	res: Response<any, Record<string, any>>
) {
	const { userId, authToken, expires, secure, domain } = args

	// Visible only to the server to prevent XSS attacks.
	res.cookie("authToken", authToken, {
		httpOnly: true,
		secure,
		expires,
		domain,
	})

	// Visible on the client so the client knows the userId.
	res.cookie("userId", userId, {
		httpOnly: false,
		secure,
		expires,
		domain,
	})
}

/** Assumes using cookie-parser middleware. */
export function getAuthTokenCookie(req: Request) {
	const authTokenId = req.cookies.authToken as string | undefined
	return authTokenId
}

export function clearAuthCookies(res: Response) {
	res.clearCookie("authToken")
	res.clearCookie("userId")
}

export function getCurrentUserId(environment: { db: TupleDb }, req: Request) {
	const token = getAuthTokenCookie(req)
	if (token) {
		const authToken = getAuth(environment.db, token)
		if (!authToken) throw new PermissionError("Invalid authToken.")
		return authToken.userId
	}
}

export function getCurrentUser(environment: { db: TupleDb }, req: Request) {
	const userId = getCurrentUserId(environment, req)
	if (userId) {
		const user = getUser(environment.db, userId)
		if (!user) throw new BrokenError("User not found for authToken.")
		return user
	}
}
