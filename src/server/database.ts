import {
	MessageRecord,
	PasswordRecord,
	RecordMap,
	RecordPointer,
	RecordWithTable,
	ThreadRecord,
	UserRecord,
} from "../shared/schema"

export type DatabaseApi = {
	getUserById(userId: string): Promise<UserRecord | undefined>
	getUserByUsername(username: string): Promise<UserRecord | undefined>
	getPassword(userId: string): Promise<PasswordRecord | undefined>
	getThreads(): Promise<ThreadRecord[]>
	getMessages(threadId: string): Promise<MessageRecord[]>
	getRecords(pointers: RecordPointer[]): Promise<RecordMap>
	/** This should only get called by the write api. */
	write(records: RecordWithTable[]): Promise<void>
}
