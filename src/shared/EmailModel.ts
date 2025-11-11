/*
Email data model example.

https://www.notion.so/chetcorcos/Email-App-Comms-Design-Doc-1c88d4136624801083dfc1cd0c9d0465?pvs=4

*/

import { RecordDb } from "tupledb/RecordDb"
import * as t from "./DataType"

const UserSchema = t.object({
	table: t.literal("user"),
	id: t.string,
	email: t.string,
	name: t.string,
})

export type User = t.InferType<typeof UserSchema>

const RoleSchema = t.object({
	userId: t.string,
	role: t.or(t.literal("admin"), t.literal("member")),
})

export type Role = t.InferType<typeof RoleSchema>

const OrgSchema = t.object({
	table: t.literal("org"),
	id: t.string,
	name: t.string,
	members: t.array(RoleSchema),
	channelIds: t.array(t.string),
})

export type Org = t.InferType<typeof OrgSchema>

const ChannelSchema = t.object({
	table: t.literal("channel"),
	id: t.string,
	org: t.string,
	name: t.string,
	type: t.or(t.literal("public"), t.literal("org"), t.literal("private")),
	members: t.array(RoleSchema),
	channelIds: t.array(t.string),
})

export type Channel = t.InferType<typeof ChannelSchema>

const ReceieverSchema = t.or(
	t.object({ type: t.literal("user"), id: t.string }),
	t.object({ type: t.literal("channel"), id: t.string })
)

export type Receiever = t.InferType<typeof ReceieverSchema>

const TextContentSchema = t.object({
	type: t.literal("text"),
	body: t.string,
})

export type TextContent = t.InferType<typeof TextContentSchema>

const InviteChannelContentSchema = t.object({
	type: t.literal("inviteChannel"),
	value: RoleSchema,
})

export type InviteChannelContent = t.InferType<typeof InviteChannelContentSchema>

const InviteMessageContentSchema = t.object({
	type: t.literal("inviteMessage"),
	value: RoleSchema,
})

export type InviteMessageContent = t.InferType<typeof InviteMessageContentSchema>

const NewChannelContentSchema = t.object({
	type: t.literal("newChannel"),
	channelId: ChannelSchema,
})

export type NewChannelContent = t.InferType<typeof NewChannelContentSchema>

const StatusSchema = t.or(
	t.object({ type: t.literal("draft"), timestamp: t.datetime }),
	t.object({ type: t.literal("scheduled"), timestamp: t.datetime }),
	t.object({ type: t.literal("sent"), timestamp: t.datetime })
)

export type Status = t.InferType<typeof StatusSchema>

const ReactionSchema = t.object({
	userId: t.string,
	value: t.string,
})

export type Reaction = t.InferType<typeof ReactionSchema>

const OutgoingMessageSchema = t.object({
	table: t.literal("message"),
	id: t.string,
	root: t.string, // id of the first message in the thread
	branch: t.optional(t.string), // is of the message that this branched from (next message has this message as the root.)

	authorId: t.string,
	subject: t.string,
	to: t.array(ReceieverSchema),

	// Anything that shows up in the timeline is a message.
	content: t.optional(
		t.or(
			TextContentSchema,
			InviteChannelContentSchema,
			InviteMessageContentSchema,
			NewChannelContentSchema
		)
	),

	status: StatusSchema,
	reactions: t.array(ReactionSchema),

	metadata: t.map(t.any),
})

export type OutgoingMessage = t.InferType<typeof OutgoingMessageSchema>

const IncomingMessageSchema = t.object({
	table: t.literal("inbox"),
	id: t.string,
	userId: t.string,
	receivedAt: t.datetime,
	messageId: t.string,
	subscriptionIds: t.array(t.string),

	read: t.boolean,
	readAt: t.optional(t.string),

	done: t.boolean,
	doneAt: t.optional(t.string),

	metadata: t.map(t.any),
})

export type IncomingMessage = t.InferType<typeof IncomingMessageSchema>

const SubscriptionTargetSchema = t.or(
	t.object({ type: t.literal("user"), id: t.string }),
	t.object({ type: t.literal("channel"), id: t.string }),
	t.object({ type: t.literal("message"), id: t.string }),
	t.object({ type: t.literal("org"), id: t.string })
)

const SubscriptionSchema = t.object({
	table: t.literal("subscription"),
	id: t.string,
	userId: t.string,
	/** which subscription gets evaluated first. */
	priority: t.number,
	/** what are we subscribing to? */
	target: SubscriptionTargetSchema,
	/** custom filter on metadata */
	filterJs: t.string,
	/** custom mapping of metadata */
	mapJs: t.string,
})

export type Subscription = t.InferType<typeof SubscriptionSchema>

const ViewSchema = t.object({
	table: t.literal("view"),
	id: t.string,
	userId: t.string,
	order: t.number,
	checkpointAt: t.optional(t.datetime),
	filterJs: t.string,
})

export type View = t.InferType<typeof ViewSchema>

export const tables = {
	user: UserSchema,
	org: OrgSchema,
	channel: ChannelSchema,
	message: OutgoingMessageSchema,
	inbox: IncomingMessageSchema,
	subscription: SubscriptionSchema,
	view: ViewSchema,
}

export const secondaryIndexes = {
	org: {
		byMember: function* (org: Org) {
			for (const m of org.members) yield [m.userId, org.id]
		},
	},
	subscription: {
		byUser: (sub: Subscription) => [sub.userId, sub.priority, sub.id],
		byTarget: (sub: Subscription) => [sub.target.type, sub.target.id, sub.priority, sub.id],
	},
	message: {
		byAuthor: (m: OutgoingMessage) => [m.authorId, m.status.type, m.status.timestamp, m.id],
		byTo: function* (m: OutgoingMessage) {
			for (const to of m.to) yield [to.type, to.id, m.status.type, m.status.timestamp, m.id]
		},
	},
	inbox: {
		byUser: (inbox: IncomingMessage) => [inbox.userId, inbox.receivedAt, inbox.messageId],
		byUserReadAt: (inbox: IncomingMessage) =>
			inbox.read && [(inbox.userId, inbox.readAt, inbox.messageId)],
		byUserDoneAt: (inbox: IncomingMessage) =>
			inbox.done && [inbox.userId, inbox.doneAt, inbox.messageId],
		bySubscription: function* (inbox: IncomingMessage) {
			for (const subId of inbox.subscriptionIds)
				yield [inbox.userId, subId, inbox.receivedAt, inbox.messageId]
		},
	},
	view: {
		byUser: (view: View) => [view.userId, view.order, view.id],
	},
}

export const initEmailModel = (db: RecordDb) => {
	for (const [table, dataType] of Object.entries(tables)) {
		db.setTable({ table, dataType })
	}
	for (const [table, indexes] of Object.entries(secondaryIndexes)) {
		for (const [name, fn] of Object.entries(indexes)) {
			if (db.hasIndex({ table, name })) continue
			db.createIndex({ table, name, fn })
		}
	}
}

/*

- login
- list org members and edit
- create a new org
- list of org channels in a tree view
- create a new channel
- edit channel members
- list user’s subscriptions

    `["usersubs", sub.user, sub.type, sub.id]`

- list user outgoing mail

    `["outbox", message.author, message.edited, message.id]`

- list user incoming mail

    `["inbox", message.author, message.sent, message.id]`

- list channel messages
- draft a message
- schedule or send a message
- list inbox views
- edit inbox views
- search all messages
- reply to a message
    - edit recipients in the reply
- branch a message
- react to a message

*/

// Primary records
// Schemas for validation
// Secondary indexes
// Tertiary indexes

// compound indexes with alternating +/- directions...
// tertiary indexes
// All of the queries we need.
// Permissions.
