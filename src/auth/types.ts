import { TupleDb } from "tupledb/types"

export type AuthConfig = {
	production: boolean
	host: string
	passwordSalt: Buffer
}

export type AuthEnvironment = {
	config: AuthConfig
	db: TupleDb
}
