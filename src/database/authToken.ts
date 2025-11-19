import { TupleDb } from "tupledb/types"
import { AuthToken } from "./schema"

export function createAuthToken(db: TupleDb, authToken: AuthToken) {
	db.set(["authToken", authToken.authToken], authToken)
}

export function deleteAuthToken(db: TupleDb, authToken: string) {
	db.delete(["authToken", authToken])
}

export function getAuthToken(db: TupleDb, authToken: string) {
	return db.get(["authToken", authToken]) as AuthToken | undefined
}
