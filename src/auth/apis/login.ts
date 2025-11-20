import { createAuth } from "database/auth"
import { getPasswordForUserId } from "database/password"
import { Auth } from "database/schema"
import { getUserByUsername } from "database/user"
import type { Request, Response } from "express"
import secureCompare from "secure-compare"
import * as t from "shared/DataType"
import { DayMs } from "shared/dateHelpers"
import { BrokenError, NotFoundError, ValidationError } from "shared/errors"
import { randomId } from "shared/randomId"
import { getPasswordHash, setAuthCookies } from "../server"
import { AuthEnvironment } from "./types"

export const input = t.object({
	username: t.string,
	password: t.string,
})

export async function login(environment: AuthEnvironment, args: t.InferType<typeof input>) {
	const { db, config } = environment
	const { username, password } = args

	const { passwordSalt } = config
	const passwordHash = await getPasswordHash({ passwordSalt, password })

	const user = getUserByUsername(db, username)
	if (!user) throw new NotFoundError(`User not found: ${username}`)

	const passwordRecord = getPasswordForUserId(db, user.id)
	if (!passwordRecord) throw new BrokenError("Found a user without a password record.")

	// Secure compare to prevent timing attacks.
	if (!secureCompare(passwordHash, passwordRecord.passwordHash))
		throw new ValidationError("Invalid password.")

	const authToken: Auth = {
		token: randomId(),
		userId: user.id,
		createdAt: new Date().toISOString(),
	}

	createAuth(db, authToken)

	return authToken
}

export async function handler(
	environment: AuthEnvironment,
	args: t.InferType<typeof input>,
	req: Request,
	res: Response
) {
	const { config } = environment
	const authToken = await login(environment, args)
	await setAuthCookies(
		{
			userId: authToken.userId,
			authToken: authToken.token,
			expires: new Date(Date.now() + 120 * DayMs),
			secure: config.production,
			domain: config.production ? config.host : undefined,
		},
		res
	)
	return
}
