import { getPasswordHash, setAuthCookies } from "auth/auth"
import { createAuthToken } from "database/authToken"
import { getPasswordForUserId } from "database/password"
import { AuthToken } from "database/schema"
import { getUserByUsername } from "database/user"
import type { Request, Response } from "express"
import { secureCompare } from "secure-compare"
import { ServerConfig } from "server/services/ServerConfig"
import * as t from "shared/DataType"
import { DayMs } from "shared/dateHelpers"
import { BrokenError, NotFoundError, ValidationError } from "shared/errors"
import { randomId } from "shared/randomId"
import { TupleDb } from "tupledb/types"

export const input = t.object({
	username: t.string,
	password: t.string,
})

export async function login(
	environment: { config: ServerConfig; db: TupleDb },
	args: t.InferType<typeof input>
) {
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

	const authToken: AuthToken = {
		authToken: randomId(),
		userId: user.id,
		createdAt: new Date().toISOString(),
	}

	createAuthToken(db, authToken)

	return authToken
}

export async function handler(
	environment: { config: ServerConfig; db: TupleDb },
	args: t.InferType<typeof input>,
	req: Request,
	res: Response
) {
	const { config } = environment
	const authToken = await login(environment, args)
	await setAuthCookies(
		{
			userId: authToken.userId,
			authToken: authToken.authToken,
			expires: new Date(Date.now() + 120 * DayMs),
			secure: config.production,
			domain: config.production ? config.host : undefined,
		},
		res
	)
	return
}
