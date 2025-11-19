import { TupleDb } from "tupledb/types"
import type { User } from "./schema"

export function getUserByUsername(db: TupleDb, username: string) {
	return db.get(["user", username]) as User | undefined
}

export function createUser(db: TupleDb, user: User) {
	db.set(["user", user.username], user)
}
