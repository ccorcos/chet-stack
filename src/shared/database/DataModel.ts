/*
Email data model example.

https://www.notion.so/chetcorcos/Email-App-Comms-Design-Doc-1c88d4136624801083dfc1cd0c9d0465?pvs=4

*/

// schema validation
// indexing
// compound indexes with alternating +/- directions...
// tertiary indexes
// All of the queries we need.
// Just start typing it all out.

import * as t from "../DataType"

const UserSchema = t.object({
	id: t.string,
	email: t.string,
	name: t.string,
})

type User = t.InferType<typeof UserSchema>

const UserProfileSchema = t.object({
	id: t.string,
	name: t.string,
})

type UserProfile = t.InferType<typeof UserProfileSchema>

const RoleSchema = t.object({
	userId: t.string,
	role: t.or(t.literal("admin"), t.literal("member")),
})

type Role = t.InferType<typeof RoleSchema>

const OrgSchema = t.object({
	id: t.string,
	name: t.string,
	members: t.array(RoleSchema),
	channelIds: t.array(t.string),
})

type Org = t.InferType<typeof OrgSchema>

const ChannelSchema = t.object({
	id: t.string,
	org: t.string,
	name: t.string,
	type: t.or(t.literal("public"), t.literal("org"), t.literal("private")),
	members: t.array(RoleSchema),
	channelIds: t.array(t.string),
})

type Channel = t.InferType<typeof ChannelSchema>

const ReceieverSchema = t.or(
	t.object({ type: t.literal("user"), id: t.string }),
	t.object({ type: t.literal("channel"), id: t.string })
)

type Receiever = t.InferType<typeof ReceieverSchema>

const TextContentSchema = t.object({
	type: t.literal("text"),
	body: t.string,
})

type TextContent = t.InferType<typeof TextContentSchema>

const InviteChannelContentSchema = t.object({
	type: t.literal("inviteChannel"),
	role: RoleSchema,
})

type InviteChannelContent = t.InferType<typeof InviteChannelContentSchema>

const InviteMessageContentSchema = t.object({
	type: t.literal("inviteMessage"),
	role: RoleSchema,
})

type InviteMessageContent = t.InferType<typeof InviteMessageContentSchema>

const NewChannelContentSchema = t.object({
	type: t.literal("newChannel"),
	channelId: ChannelSchema,
})

type NewChannelContent = t.InferType<typeof NewChannelContentSchema>

const StatusSchema = t.or(
	t.object({ type: t.literal("draft"), editedAt: t.string }),
	t.object({ type: t.literal("scheduled"), id: t.string }),
	t.object({ type: t.literal("sent"), id: t.string })
)

type Status = t.InferType<typeof StatusSchema>

const ReactionSchema = t.object({
	userId: t.string,
	value: t.string,
})

type Reaction = t.InferType<typeof ReactionSchema>

const OutgoingMessageSchema = t.object({
	id: t.string,
	root: t.string,
	branch: t.optional(t.string),

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

type OutgoingMessage = t.InferType<typeof OutgoingMessageSchema>

const IncomingMessageSchema = t.object({
	id: t.string,
	userId: t.string,
	subscriptionId: t.string,
	messageId: t.string,

	read: t.boolean,
	done: t.boolean,

	metadata: t.map(t.any),
})

type IncomingMessage = t.InferType<typeof IncomingMessageSchema>

const SubscriptionTargetSchema = t.or(
	t.object({ type: t.literal("user"), id: t.string }),
	t.object({ type: t.literal("channel"), id: t.string }),
	t.object({ type: t.literal("message"), id: t.string }),
	t.object({ type: t.literal("org"), id: t.string })
)

const SubscriptionSchema = t.object({
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

type Subscription = t.InferType<typeof SubscriptionSchema>

const ViewSchema = t.object({
	id: t.string,
	userId: t.string,
	order: t.number,
	filterJs: t.string,
})

type View = t.InferType<typeof ViewSchema>
