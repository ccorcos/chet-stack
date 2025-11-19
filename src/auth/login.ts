import type { Request, Response } from "express"
import { getPasswordHash } from "./auth"

// TODO: remove server environment dependency.
import type { ServerEnvironment } from "server/services/ServerEnvironment"
// TODO: delete this stuff?

export async function handler(
	environment: ServerEnvironment,
	args: { username: string; password: string },
	req: Request,
	res: Response
) {
	const { username, password } = args

	const passwordHash = await getPasswordHash({
		passwordSalt: environment.config.passwordSalt,
		password,
	})

	// const user = await db.getUserByUsername(username)
	// if (!user) throw new NotFoundError(`User not found: ${username}`)

	// const passwordRecord = await db.getPassword(user.id)
	// if (!passwordRecord) throw new FailedDependencyError("Found a user without a password record.")

	// // Secure compare to prevent timing attacks.
	// if (!secureCompare(passwordHash, passwordRecord.password_hash))
	// 	throw new ValidationError("Invalid password.")

	// Create the cookie record.
	// await setAuthCookies(environment, user.id, res)

	// return { recordMap }
}
