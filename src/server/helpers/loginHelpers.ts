import { scrypt } from "crypto"
import type { Response } from "express"
import { DayMs } from "../../shared/dateHelpers"
import { randomId } from "../../shared/randomId"
import { AuthTokenRecord } from "../../shared/schema"
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
	userId: string,
	res: Response<any, Record<string, any>>
) {
	const { config } = environment

	const expiration = new Date(Date.now() + 120 * DayMs)
	const authToken: AuthTokenRecord = {
		id: randomId(),
		version: 0,
		user_id: userId,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		expires_at: expiration.toISOString(),
	}
	await environment.db.createAuthToken(authToken)

	// Set the cookie on the response.
	res.cookie("authToken", authToken.id, {
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
