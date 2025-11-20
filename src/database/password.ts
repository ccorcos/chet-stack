import { TupleDb } from "tupledb/types"
import { Password } from "./schema"

export function createPassword(db: TupleDb, password: Password) {
	db.set(["password/userId", password.userId], password)
}

export function getPasswordForUserId(db: TupleDb, userId: string) {
	return db.get(["password/userId", userId]) as Password | undefined
}
