/*

- Every record must contain {id: string, version: number}
- Use snake_case instead of camelCase because SQL is case-insensitive.

*/

export type UserRecord = {
	id: string
	version: number
	last_version?: number
	username: string
	created_at: string
	updated_at: string
}

export type UserSettingsRecord = {
	id: string
	version: number
	last_version?: number
	created_at: string
	updated_at: string

	// TODO: later we'll query threads based on member_ids.
	thread_ids?: string[]
}

export type PasswordRecord = {
	id: string // same as userId
	version: number
	last_version?: number
	created_at: string
	updated_at: string
	password_hash: string
}

export type AuthTokenRecord = {
	id: string // the is is the token
	version: number
	last_version?: number
	created_at: string
	updated_at: string
	expires_at: string
	deleted?: boolean
}

export type ThreadRecord = {
	id: string
	version: number
	last_version?: number
	member_ids: string[]
	created_at: string
	updated_at: string
	replied_at: string
	subject: string

	// TODO: later we'll query messages based on thread_id.
	message_ids?: string[]
}

export type MessageRecord = {
	id: string
	version: number
	last_version?: number
	author_id: string
	thread_id: string
	created_at: string
	updated_at: string
	text: string
}

export type TableToRecord = {
	user: UserRecord
	user_settings: UserSettingsRecord
	thread: ThreadRecord
	message: MessageRecord
	password: PasswordRecord
	auth_token: AuthTokenRecord
}

type DistributiveProp<T, K extends keyof T> = T extends unknown ? T[K] : never

export type RecordTable = keyof TableToRecord

export type RecordValue<T extends RecordTable = RecordTable> = TableToRecord[T]

export type RecordWithTable<Table extends RecordTable = RecordTable> = {
	[T in RecordTable]: { table: T; id: string; record: TableToRecord[T] }
}[Table]

export type RecordPointer<Table extends RecordTable = RecordTable> = { table: Table; id: string }

export type RecordMap = {
	[T in RecordTable]?: {
		[id: string]: TableToRecord[T] | undefined
	}
}
