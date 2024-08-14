import { RecordPointer, RecordTable } from "./schema"

export function pointerToKy<T extends RecordTable>({ table, id }: RecordPointer<T>) {
	return [table, id].join(":")
}

export function keyToPointr(key: string) {
	const [table, id] = key.split(":")
	return { table, id } as RecordPointer
}

export type Subscription =
	| { type: "getRecord"; pointer: RecordPointer }
	| { type: "getMessages"; threadId: string }
	| { type: "getThreads"; userId: string }

export function toSubscriptionKey(sub: Subscription) {
	if (sub.type === "getRecord") return ["getRecord", sub.pointer.table, sub.pointer.id].join(":")
	if (sub.type === "getMessages") return ["getMessages", sub.threadId].join(":")
	if (sub.type === "getThreads") return ["getThreads", sub.userId].join(":")
	throw new Error("Unknown subscription type.")
}

export function fromSubscriptionKey(key: string): Subscription {
	const tuple = key.split(":")
	if (tuple[0] === "getRecord")
		return { type: "getRecord", pointer: { table: tuple[1] as RecordTable, id: tuple[2] } }
	if (tuple[0] === "getMessages") return { type: "getMessages", threadId: tuple[1] }
	if (tuple[0] === "getThreads") return { type: "getThreads", userId: tuple[1] }
	throw new Error("Unknown subscription key: " + key)
}
