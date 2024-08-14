/*

- Every record must contain {id: string, version: number}
- Use snake_case instead of camelCase because SQL is case-insensitive.

*/

import * as t from "./dataTypes"
import { iterateRecordMap } from "./recordMapHelpers"

export const UserSchema = t.object({
	id: t.uuid,
	version: t.number,
	username: t.string,
	created_at: t.datetime,
	updated_at: t.datetime,
})

export type UserRecord = t.Infer<typeof UserSchema>

export const UserSettingsSchema = t.object({
	id: t.uuid,
	version: t.number,
	created_at: t.datetime,
	updated_at: t.datetime,
	// Private object to the user. Nothing in here anymore / yet.
})

export type UserSettingsRecord = t.Infer<typeof UserSettingsSchema>

export const PasswordSchema = t.object({
	id: t.uuid, // same as userId
	version: t.number,
	created_at: t.datetime,
	updated_at: t.datetime,
	password_hash: t.string,
})

export type PasswordRecord = t.Infer<typeof PasswordSchema>

export const AuthTokenSchema = t.object({
	id: t.uuid, // the id is the token
	version: t.number,
	created_at: t.datetime,
	updated_at: t.datetime,
	user_id: t.uuid,
	expires_at: t.datetime,
})

export type AuthTokenRecord = t.Infer<typeof AuthTokenSchema>

export const ThreadSchema = t.object({
	id: t.uuid,
	version: t.number,
	created_at: t.datetime,
	updated_at: t.datetime,
	created_by: t.uuid,
	member_ids: t.array(t.uuid),
	replied_at: t.datetime,
	subject: t.string,
	deleted: t.optional(t.boolean),
})

export type ThreadRecord = t.Infer<typeof ThreadSchema>

export const MessageSchema = t.object({
	id: t.uuid,
	version: t.number,
	created_at: t.datetime,
	updated_at: t.datetime,
	author_id: t.uuid,
	thread_id: t.uuid,
	file_ids: t.optional(t.array(t.uuid)),
	text: t.string,
	deleted: t.optional(t.boolean),
})

export type MessageRecord = t.Infer<typeof MessageSchema>

export const FileSchema = t.object({
	id: t.uuid,
	version: t.number,
	created_at: t.datetime,
	updated_at: t.datetime,
	filename: t.string,
	owner_id: t.uuid,
	parent_table: t.optional(t.union(t.literal("user"), t.literal("message"))),
	parent_id: t.optional(t.uuid),
	deleted: t.optional(t.boolean),
})

export type FileRecord = t.Infer<typeof FileSchema>

export type TableToRecord = {
	user: UserRecord
	user_settings: UserSettingsRecord
	thread: ThreadRecord
	message: MessageRecord
	password: PasswordRecord
	auth_token: AuthTokenRecord
	file: FileRecord
}

export type RecordTable = keyof TableToRecord

export type RecordValue<T extends RecordTable = RecordTable> = TableToRecord[T]

export type RecordWithTable<T extends RecordTable = RecordTable> = {
	[K in T]: { table: K; id: string; record: TableToRecord[K] }
}[T]

export type RecordPointer<T extends RecordTable = RecordTable> = {
	[K in T]: { table: K; id: string }
}[T]

export type RecordMap = {
	[T in RecordTable]?: {
		[id: string]: TableToRecord[T] | undefined
	}
}

export type VersionMap = {
	[T in RecordTable]?: {
		[id: string]: number
	}
}

export const recordSchemas: { [K in keyof TableToRecord]: t.Validator<TableToRecord[K]> } = {
	user: UserSchema,
	user_settings: UserSettingsSchema,
	thread: ThreadSchema,
	message: MessageSchema,
	password: PasswordSchema,
	auth_token: AuthTokenSchema,
	file: FileSchema,
}

export function validateRecord(value: RecordWithTable) {
	return recordSchemas[value.table].validate(value.record)
}

export function validateRecordMap(recordMap: RecordMap) {
	for (const value of iterateRecordMap(recordMap)) {
		const error = validateRecord(value)
		if (error) return error
	}
}

export const recordTables: { [table in RecordTable]: true } = {
	user: true,
	user_settings: true,
	thread: true,
	message: true,
	password: true,
	auth_token: true,
	file: true,
}

/** If a user can delete this record by setting deleted: true, when undoing an action. */
export const canDeleteTables: { [table in RecordTable]: boolean } = {
	user: false,
	user_settings: false,
	thread: true,
	message: true,
	password: false,
	auth_token: false,
	file: false,
}
