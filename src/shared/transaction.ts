export type SetOperation = {
	type: "set"
	table: string
	id: string
	key: string[]
	value: any
}

export type InsertOperation = {
	type: "insert"
	table: string
	id: string
	key: string[]
	value: any
	where: "prepend" | "append" | { before: any } | { after: any }
}

export type RemoveOperation = {
	type: "remove"
	table: string
	id: string
	key: string[]
	value: any
}

export type Operation = SetOperation | InsertOperation | RemoveOperation

export type Transaction = { authorId: string; operations: Operation[] }
