import { set } from "lodash"
import { RecordPointer, RecordWithTable } from "./schema"

export function getRecordMap<
	R extends { [table: string]: { [id: string]: any } },
	Table extends keyof R
>(recordMap: R, pointer: { table: Table; id: string }): NonNullable<R[Table]>[string] | undefined {
	const { table, id } = pointer
	return recordMap[table]?.[id]
}

/** NOTE: this function mutates the recordMap! */
export function setRecordMap<
	R extends { [table: string]: { [id: string]: any } },
	Table extends keyof R
>(recordMap: R, pointer: { table: Table; id: string }, value: NonNullable<R[Table]>[string]) {
	const { table, id } = pointer
	set(recordMap, [table, id], value)
}

/** NOTE: this function mutates the recordMap! */
export function deleteRecordMap<
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

export function getRecordPointer({ table, id }: RecordPointer): RecordPointer {
	return { table, id }
}
