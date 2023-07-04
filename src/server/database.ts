import {
	PasswordRecord,
	RecordMap,
	RecordPointer,
	RecordTable,
	RecordWithTable,
	TableToRecord,
	ThreadRecord,
	UserRecord,
} from "../shared/schema"

export type DatabaseApi = {
	getRecord<T extends RecordTable>(pointer: RecordPointer<T>): Promise<TableToRecord[T] | undefined>
	getRecords(pointers: RecordPointer[]): Promise<RecordMap>

	getUserById(userId: string): Promise<UserRecord | undefined>
	getUserByUsername(username: string): Promise<UserRecord | undefined>
	getPassword(userId: string): Promise<PasswordRecord | undefined>

	searchUsers(query: string): Promise<UserRecord[]>

	getMessageThread(messageId: string): Promise<ThreadRecord | undefined>

	/** This should only get called by the write api. */
	write(records: RecordWithTable[]): Promise<void>
}
