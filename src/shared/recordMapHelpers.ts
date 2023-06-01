export function getRecordMap<
	R extends { [table: string]: { [id: string]: any } },
	T extends keyof R
>(recordMap: R, pointer: { table: T; id: string }): R[T][string] | undefined {
	const { table, id } = pointer
	if (!recordMap[table]) return
	return recordMap[table][id]
}

// NOTE: this function mutates the recordMap!
export function setRecordMap<
	R extends { [table: string]: { [id: string]: any } },
	T extends keyof R
>(recordMap: R, pointer: { table: T; id: string }, value: R[T][string]) {
	const { table, id } = pointer

	// @ts-ignore
	if (!recordMap[table]) recordMap[table] = {}
	// @ts-ignore
	recordMap[table][id] = value
}

// NOTE: this function mutates the recordMap!
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
