import { scrypt } from "crypto"
import type { Request, Response } from "express"
import { ServerConfig } from "../services/ServerConfig"
import { ServerEnvironment } from "../services/ServerEnvironment"

export async function getPasswordHash(environment: { config: ServerConfig }, password: string) {
	const passwordHash = await new Promise<string>((resolve, reject) => {
		scrypt(password, environment.config.passwordSalt, 64, (error, hash) => {
			if (error) return reject(error)
			else resolve(hash.toString("base64"))
		})
	})
	return passwordHash
}

export async function setAuthCookies(
	environment: ServerEnvironment,
	args: {
		authToken: string
		expiration: Date
		userId: string
	},
	res: Response<any, Record<string, any>>
) {
	const { config } = environment
	const { authToken, expiration, userId } = args

	// Set the cookie on the response.
	res.cookie("authToken", authToken, {
		secure: config.production,
		httpOnly: true,
		expires: expiration,
		domain: config.production ? config.domain : undefined,
	})

	// Set the current logged in userId so the client knows.
	res.cookie("userId", userId, {
		secure: config.production,
		httpOnly: false,
		expires: expiration,
		domain: config.production ? config.domain : undefined,
	})
}

export async function getAuthTokenCookie(req: Request) {
	const authTokenId = req.cookies.authToken as string | undefined
	return authTokenId
}

export async function clearAuthCookies(res: Response) {
	res.clearCookie("authToken")
	res.clearCookie("userId")
}
