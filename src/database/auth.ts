import { TupleDb } from "tupledb/types"
import { Auth } from "./schema"

export function createAuth(db: TupleDb, auth: Auth) {
	db.set(["auth/token", auth.token], auth)
}

export function deleteAuth(db: TupleDb, token: string) {
	db.delete(["auth/token", token])
}

export function getAuth(db: TupleDb, token: string) {
	return db.get(["auth/token", token]) as Auth | undefined
}
