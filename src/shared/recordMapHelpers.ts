import { set } from "lodash"
import { RecordWithTable } from "./schema"

export namespace RecordMapHelpers {
	export function getRecord<
		R extends { [table: string]: { [id: string]: any } },
		T extends keyof R
	>(recordMap: R, pointer: { table: T; id: string }): NonNullable<R[T]>[string] | undefined {
		const { table, id } = pointer
		return recordMap[table]?.[id]
	}

	/** NOTE: this function mutates the recordMap! */
	export function setRecord<
		R extends { [table: string]: { [id: string]: any } },
		T extends keyof R
	>(recordMap: R, pointer: { table: T; id: string }, value: NonNullable<R[T]>[string]) {
		const { table, id } = pointer
		set(recordMap, [table, id], value)
	}

	/** NOTE: this function mutates the recordMap! */
	export function deleteRecord<
		R extends { [table: string]: { [id: string]: any } },
		T extends keyof R
	>(recordMap: R, pointer: { table: T; id: string }) {
		const { table, id } = pointer

		if (recordMap[table]) {
			delete recordMap[table][id]
			if (Object.keys(recordMap[table]).length === 0) {
				delete recordMap[table]
			}
		}
	}

	export function* iterateRecordMap<R extends { [table: string]: { [id: string]: any } }>(
		recordMap: R
	): Generator<RecordWithTable> {
		for (const [table, idMap] of Object.entries(recordMap)) {
			for (const [id, record] of Object.entries(idMap)) {
				yield { table, id, record } as RecordWithTable
			}
		}
	}
}
