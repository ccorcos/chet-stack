/*

- Every record must contain {id: string, version: number}
- Use snake_case instead of camelCase because SQL is case-insensitive.

*/

export type UserRecord = {
	id: string
	version: number
	name: string
	created_at: string
	updated_at: string
}

export type ThreadRecord = {
	id: string
	version: number
	member_ids: string[]
	created_at: string
	updated_at: string
	replied_at: string
	subject: string
}

export type MessageRecord = {
	id: string
	version: number
	author_id: string
	thread_id: string
	created_at: string
	updated_at: string
	text: string
}

export type TableToRecord = {
	user: UserRecord
	thread: ThreadRecord
	message: MessageRecord
}

export type RecordMap = {
	[T in keyof TableToRecord]?: {
		[id: string]: TableToRecord[T] | undefined
	}
}

export type RecordWithTable = {
	[T in keyof TableToRecord]: { table: T; record: TableToRecord[T] }
}[keyof TableToRecord]

export type RecordPointer = {
	[T in keyof TableToRecord]: { table: T; id: string }
}[keyof TableToRecord]
