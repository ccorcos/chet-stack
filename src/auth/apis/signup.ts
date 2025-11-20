import { getPasswordHash } from "auth/server"
import { createPassword } from "database/password"
import { User } from "database/schema"
import { createUser, getUserByUsername } from "database/user"
import type { Request, Response } from "express"
import { ServerConfig } from "server/services/ServerConfig"
import * as t from "shared/DataType"
import { ValidationError } from "shared/errors"
import { randomId } from "shared/randomId"
import { tupleTx } from "tupledb/TupleDb"
import { TupleDb } from "tupledb/types"
import { handler as login } from "./login"

export const input = t.object({
	username: t.string,
	password: t.string,
})

export async function signup(
	environment: { config: ServerConfig; db: TupleDb },
	args: t.InferType<typeof input>
) {
	const { db, config } = environment
	const { username, password } = args

	if (username.length > 30)
		throw new ValidationError("Your username must be less than 30 characters.")
	if (password.length < 4) throw new ValidationError("You password must be at least 4 characters.")

	const existingUser = getUserByUsername(db, username)
	if (existingUser) throw new ValidationError(`User already exists: ${username}`)

	const { passwordSalt } = config
	const passwordHash = await getPasswordHash({ passwordSalt, password })

	const tx = tupleTx(db)
	const now = new Date().toISOString()

	const user: User = {
		id: randomId(),
		username,
		createdAt: now,
		updatedAt: now,
	}
	createUser(tx, user)
	createPassword(tx, {
		userId: user.id,
		passwordHash,
		createdAt: now,
		updatedAt: now,
	})

	tx.commit()

	return user
}

export async function handler(
	environment: { config: ServerConfig; db: TupleDb },
	args: t.InferType<typeof input>,
	req: Request,
	res: Response
) {
	await signup(environment, args)
	await login(environment, args, req, res)
}
