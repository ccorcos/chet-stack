import * as t from "shared/DataType"

export const ClientMessageSchema = t.object({
	type: t.or(t.literal("subscribe"), t.literal("unsubscribe")),
	key: t.string,
})

export const ServerMessageSchema = t.object({
	type: t.literal("update"),
	key: t.string,
	value: t.any,
})

export type ClientMessage = t.InferType<typeof ClientMessageSchema>
export type ServerMessage = t.InferType<typeof ServerMessageSchema>
