import type { Request, Response } from "express"
import secureCompare from "secure-compare"
import * as t from "../../shared/dataTypes"
import { BrokenError, NotFoundError, ValidationError } from "../../shared/errors"
import { setRecordMap } from "../../shared/recordMapHelpers"
import { RecordMap } from "../../shared/schema"
import { getPasswordHash, setAuthCookies } from "../helpers/loginHelpers"
import type { ServerEnvironment } from "../services/ServerEnvironment"

export const input = t.object({
	username: t.string,
	password: t.string,
})

export async function handler(
	environment: ServerEnvironment,
	args: t.Infer<typeof input>,
	req: Request,
	res: Response
) {
	const { db } = environment
	const { username, password } = args

	const passwordHash = await getPasswordHash(environment, password)

	const user = await db.getUserByUsername(username)
	if (!user) throw new NotFoundError(`User not found: ${username}`)

	const passwordRecord = await db.getPassword(user.id)
	if (!passwordRecord) throw new BrokenError("Found a user without a password record.")

	// Secure compare to prevent timing attacks.
	if (!secureCompare(passwordHash, passwordRecord.password_hash))
		throw new ValidationError("Invalid password.")

	// Create the cookie record.
	await setAuthCookies(environment, user.id, res)

	const recordMap: RecordMap = {}
	setRecordMap(recordMap, { table: "user", id: user.id }, user)
	return { recordMap }
}
