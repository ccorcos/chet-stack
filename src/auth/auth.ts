import type { Request, Response } from "express"
import { scrypt } from "node:crypto"

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

	// Set the cookie on the response.
	res.cookie("authToken", authToken, {
		httpOnly: true,
		secure,
		expires,
		domain,
	})

	// Set the current logged in userId so the client knows.
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

// export async function getCurrentUserId(environment: { db: DatabaseApi }, req: express.Request) {
// 	const authTokenId = req.cookies.authToken as string | undefined
// 	if (!authTokenId) return

// 	const authToken = await environment.db.getRecord({ table: "auth_token", id: authTokenId })
// 	if (!authToken) return
// 	if (new Date().toISOString() > authToken.expires_at) return

// 	return authToken.user_id
// }
