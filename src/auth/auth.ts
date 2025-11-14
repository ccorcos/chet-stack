import type { Request, Response } from "express"
import { scrypt } from "node:crypto"

type AuthConfig = {
	production: boolean
	host: string
	passwordSalt: Buffer
}

type AuthDb = {
	getUserIdForUsername: (username: string) => Promise<string | undefined>
	getUserPasswordHash: (userId: string) => Promise<string | undefined>
	// saveToken
	// deleteToken
}

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
		authToken: string
		expiration: Date
		userId: string
		production: boolean
		host: string
	},
	res: Response<any, Record<string, any>>
) {
	const { production, host, authToken, expiration, userId } = args

	// Save token to the database outside?
	// const expiration = new Date(Date.now() + 120 * DayMs)
	// const authToken: AuthTokenRecord = {
	// 	id: randomId(),
	// 	version: 0,
	// 	user_id: userId,
	// 	created_at: new Date().toISOString(),
	// 	updated_at: new Date().toISOString(),
	// 	expires_at: expiration.toISOString(),
	// }
	// await environment.db.createAuthToken(authToken)

	// Set the cookie on the response.
	res.cookie("authToken", authToken, {
		secure: production,
		httpOnly: true,
		expires: expiration,
		domain: production ? host : undefined,
	})

	// Set the current logged in userId so the client knows.
	res.cookie("userId", userId, {
		secure: production,
		httpOnly: false,
		expires: expiration,
		domain: production ? host : undefined,
	})
}

/** Assumes using cookie-parser middleware. */
export async function getAuthTokenCookie(req: Request) {
	const authTokenId = req.cookies.authToken as string | undefined
	return authTokenId
}

export async function clearAuthCookies(res: Response) {
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
