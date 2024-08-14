import type { Request, Response } from "express"
import * as t from "../../shared/dataTypes"
import { ValidationError } from "../../shared/errors"
import { randomId } from "../../shared/randomId"
import { setRecordMap } from "../../shared/recordMapHelpers"
import { RecordMap, UserRecord } from "../../shared/schema"
import { Operation, op } from "../../shared/transaction"
import { getPasswordHash, setAuthCookies } from "../helpers/loginHelpers"
import type { ServerEnvironment } from "../services/ServerEnvironment"
import { write } from "./write"

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
	const { db, config, queue } = environment
	const { username, password } = args

	const existingUser = await db.getUserByUsername(username)
	if (existingUser) throw new ValidationError(`User already exists: ${username}`)

	if (password.length < 4) throw new ValidationError("You password must be at least 4 characters.")

	const passwordHash = await getPasswordHash(environment, password)

	const operations: Operation[] = []

	// Create the user.
	const user: UserRecord = {
		id: randomId(),
		version: 0,
		username,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	}
	operations.push(op.create("user", user))

	operations.push(
		op.create("user_settings", {
			id: user.id,
			version: 0,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
	)

	await write(environment, {
		txId: randomId(),
		authorId: config.adminUserId,
		operations,
	})

	// Create the password.
	await environment.db.createPassword({
		id: user.id,
		version: 0,
		password_hash: passwordHash,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	})

	// Create the cookie record.
	await setAuthCookies(environment, user.id, res)

	// Allow the request to return ASAP so we setImmediate.
	setImmediate(async () => {
		await queue.enqueue.sendWelcomeMessage({ userId: user.id })
	})

	const recordMap: RecordMap = {}
	setRecordMap(recordMap, { table: "user", id: user.id }, user)
	return { recordMap }
}
