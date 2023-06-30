import { randomUUID, scrypt } from "crypto"
import * as t from "data-type-ts"
import type { Request, Response } from "express"
import { DayMs } from "../../shared/dateHelpers"
import { BrokenError, ValidationError } from "../../shared/errors"
import { RecordMapHelpers } from "../../shared/recordMapHelpers"
import { AuthTokenRecord, RecordMap } from "../../shared/schema"
import { op, Operation } from "../../shared/transaction"
import type { ApiEndpoint } from "../api"
import type { ServerEnvironment } from "../ServerEnvironment"
import { write } from "./write"

export const input = t.obj({ username: t.string, password: t.string })

// The actual api method.
export async function login(
	environment: ServerEnvironment,
	args: typeof input.value,
	req: Request,
	res: Response
) {
	const { db, config } = environment
	const { username, password } = args

	const passwordHash = await new Promise<string>((resolve, reject) => {
		scrypt(password, config.salt, 64, (error, hash) => {
			if (error) return reject(error)
			else resolve(hash.toString("base64"))
		})
	})

	const operations: Operation[] = []

	let user = await db.getUserByUsername(username)
	if (user) {
		const passwordRecord = await db.getPassword(user.id)
		if (!passwordRecord)
			throw new BrokenError("There should never be a user without a password record.")
		if (passwordHash !== passwordRecord.password_hash)
			throw new ValidationError("Invalid password.")
	} else {
		// Create the user.
		user = {
			id: randomUUID(),
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
				thread_ids: [],
			})
		)

		// Create the password.
		operations.push(
			op.create("password", {
				id: user.id,
				version: 0,
				password_hash: passwordHash,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
		)
	}

	// Create the cookie record.
	const expiration = new Date(Date.now() + 120 * DayMs)
	const authToken: AuthTokenRecord = {
		id: randomUUID(),
		version: 0,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		expires_at: expiration.toISOString(),
	}
	operations.push(op.create("auth_token", authToken))

	// Set the cookie on the response.
	res.cookie("authToken", authToken.id, {
		secure: config.production,
		httpOnly: true, // Not visible on the client so not accessible via JS.
		expires: expiration,
		domain: config.production ? config.domain : undefined,
	})

	// Set the current logged in userId so the client knows.
	res.cookie("userId", user.id, {
		secure: config.production,
		httpOnly: false, // Visible on the client
		expires: expiration,
		domain: config.production ? config.domain : undefined,
	})

	await write(environment, { authorId: config.adminUserId, operations })

	const recordMap: RecordMap = {}
	RecordMapHelpers.setRecord(recordMap, { table: "user", id: user.id }, user)
	return { recordMap }
}

// This type is used for typescript-friendly calls to the api from the app.
export type loginApiType = {
	input: typeof input.value
	output: ReturnType<typeof login>
}

// This is used for registering this api on the server.
export const loginApi: ApiEndpoint = {
	validate: (body) => {
		const error = input.validate(body)
		if (error) return t.formatError(error)
	},
	action: login,
}
