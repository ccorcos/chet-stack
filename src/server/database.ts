import {
	MessageRecord,
	RecordMap,
	RecordPointer,
	RecordWithTable,
	ThreadRecord,
	UserRecord,
} from "../shared/schema"

export type DatabaseApi = {
	getUser(userId: string): Promise<UserRecord | undefined>
	getThreads(): Promise<ThreadRecord[]>
	getMessages(threadId: string): Promise<MessageRecord[]>
	getRecords(pointers: RecordPointer[]): Promise<RecordMap>
	write(records: RecordWithTable[]): Promise<void>
}
