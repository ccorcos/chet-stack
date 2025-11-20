import * as t from "shared/DataType"

export const ClientMessageSchema = t.or(
	t.object({
		type: t.literal("subscribe"),
		key: t.string,
	}),
	t.object({
		type: t.literal("unsubscribe"),
		key: t.string,
	}),
	t.object({
		type: t.literal("publish"),
		key: t.string,
		value: t.any,
	})
)

export const ServerMessageSchema = t.object({
	type: t.literal("publish"),
	key: t.string,
	value: t.any,
})

export type ClientMessage = t.InferType<typeof ClientMessageSchema>
export type ServerMessage = t.InferType<typeof ServerMessageSchema>
