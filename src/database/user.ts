import { TupleDb } from "tupledb/types"
import type { User } from "./schema"

export function createUser(db: TupleDb, user: User) {
	db.set(["user.id", user.id], user)
	db.set(["user.username", user.username], user)
}

export function getUser(db: TupleDb, id: string) {
	return db.get(["user.id", id]) as User | undefined
}

export function getUserByUsername(db: TupleDb, username: string) {
	return db.get(["user.username", username]) as User | undefined
}
