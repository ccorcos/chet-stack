import { groupBy, mapValues } from "lodash"
import React, { Suspense, useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { RecordPointer, RecordTable } from "../shared/schema"
import { Transaction, op } from "../shared/transaction"
import { useClientEnvironment } from "./ClientEnvironment"
import { useAsync } from "./hooks/useAsync"

export function App() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<LoadApp />
		</Suspense>
	)
}

function useRecord<T extends RecordTable>(pointer: RecordPointer<T>) {
	const { cache, loader } = useClientEnvironment()
	const promise = loader.loadRecord(pointer)
	if (!promise.loaded) throw promise

	const subscribe = useCallback(
		(update: () => void) => {
			// @ts-ignore
			return cache.addListener(pointer, update)
		},
		[pointer.table, pointer.id]
	)

	const getSnapshot = useCallback(() => {
		return cache.getRecord(pointer)
	}, [pointer.table, pointer.id])

	const record = useSyncExternalStore(subscribe, getSnapshot)

	return record
}

function useMessages(threadId: string) {
	const { api, cache, loader } = useClientEnvironment()

	useEffect(() => {
		// Read from storage
		// Fetch in parallel
		// Subscribe to changes
		api.getMessages({ threadId })
	}, [threadId])
}

function parseCookies(cookie: string) {
	const entries = cookie.split(";").map((line) => line.split("=").map((p) => p.trim()))
	const grouped = groupBy(entries, (entry) => entry[0])
	const cookies = mapValues(grouped, (entries) => entries.map((entry) => entry[1]))
	return cookies
}

function useRerender() {
	const [state, setState] = useState(0)
	return () => setState((s) => s + 1)
}

function LoadApp() {
	const rerender = useRerender()
	// Parse cookies.
	const cookies = parseCookies(document.cookie)
	const userId = cookies.userId?.[0]
	if (!userId) return <Login onLogin={rerender} />
	else return <LoadUser userId={userId} />
}

function LoadUser(props: { userId: string }) {
	const environment = useClientEnvironment()

	// TODO: not sure why typescript is being annoying.
	const user = useRecord({ table: "user", id: props.userId })
	if (!user) throw new Error("Could not load user.")

	const userSettings = useRecord({ table: "user_settings", id: props.userId })
	if (!userSettings) throw new Error("Could not load user settings.")

	const [thread, setThread] = useState<string | undefined>(userSettings.thread_ids?.[0])

	const threadIds = userSettings.thread_ids || []

	const onNewThread = () => {
		const id = window.crypto.randomUUID()

		const transction: Transaction = {
			authorId: user.id,
			operations: [
				// Operation to create the thread
				op.create("thread", {
					id,
					version: 0,
					created_by: user.id,
					member_ids: [user.id],
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
					replied_at: new Date().toISOString(),
					subject: "New Thread",
				}),
				// Operation to add the threadId to the user's list
				{
					type: "listInsert",
					table: "user_settings",
					id: user.id,
					key: ["thread_ids"],
					value: id,
					where: "prepend",
				},
			],
		}
		// Write to the transaction queue.
		environment.transactionQueue.enqueue(transction).catch(console.error)

		// Set this as the current thread.
		setThread(id)
	}

	return (
		<div style={{ display: "flex" }}>
			<div style={{ width: 200, display: "flex", flexDirection: "column" }}>
				<button onClick={onNewThread}>New Thread</button>
				{threadIds.map((id) => (
					<ThreadItem threadId={id} selected={id === thread} onClick={() => setThread(id)} />
				))}
			</div>
			<div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
				{thread ? <ThreadMessages userId={user.id} threadId={thread} /> : "Select a thread"}
			</div>
		</div>
	)
}

function UserLookup(props: { onSelect: (userId: string) => void }) {
	const { api } = useClientEnvironment()

	const [text, setText] = useState("")

	const result = useAsync(api.searchUsers, [{ query: text }])

	let error: string | undefined
	let userIds: string[] = []
	if (result) {
		if (result.status !== 200) {
			error = result.body?.message || result.body
		} else {
			userIds = result.body.userIds
		}
	}

	return (
		<span>
			<input
				placeholder="Search user"
				type="text"
				value={text}
				onChange={(e) => setText(e.target.value)}
			/>
			{error && <span style={{ color: "red" }}>{error}</span>}
			{userIds.map((userId) => {
				return (
					<span
						style={{ cursor: "pointer" }}
						onClick={() => {
							props.onSelect(userId)
							setText("")
						}}
					>
						<Username userId={userId} key={userId} />
					</span>
				)
			})}
		</span>
	)
}

function ThreadMembersInput(props: { userId: string; threadId: string }) {
	const thread = useRecord({ table: "thread", id: props.threadId })
	if (!thread) throw new Error("Could not find thread.")

	const { transactionQueue } = useClientEnvironment()

	return (
		<div>
			Members:
			{thread.member_ids.map((userId) => {
				return (
					<span>
						<Username userId={userId} key={userId} />
						<button
							onClick={() => {
								transactionQueue.enqueue({
									authorId: props.userId,
									operations: [
										{
											type: "listRemove",
											table: "thread",
											id: props.threadId,
											key: ["member_ids"],
											value: userId,
										},
									],
								})
							}}
						>
							x
						</button>
					</span>
				)
			})}
			<UserLookup
				onSelect={(userId) => {
					transactionQueue.enqueue({
						authorId: props.userId,
						operations: [
							{
								type: "listInsert",
								table: "thread",
								id: props.threadId,
								key: ["member_ids"],
								value: userId,
								where: "append",
							},
						],
					})
				}}
			/>
		</div>
	)
}

function ThreadSubjectInput(props: { userId: string; threadId: string }) {
	const thread = useRecord({ table: "thread", id: props.threadId })
	if (!thread) throw new Error("Could not find thread.")

	const { transactionQueue } = useClientEnvironment()

	return (
		<input
			type="text"
			value={thread.subject}
			onChange={(e) => {
				const newSubject = e.target.value
				transactionQueue.enqueue({
					authorId: props.userId,
					operations: [
						{
							type: "set",
							table: "thread",
							id: props.threadId,
							key: ["subject"],
							value: newSubject,
						},
					],
				})
			}}
		/>
	)
}

function NewMessageInput(props: { userId: string; threadId: string }) {
	const { transactionQueue } = useClientEnvironment()

	const [text, setText] = useState("")

	const onSubmit = () => {
		const messageId = window.crypto.randomUUID()
		transactionQueue.enqueue({
			authorId: props.userId,
			operations: [
				{
					type: "set",
					table: "message",
					id: messageId,
					key: [],
					value: {
						id: messageId,
						version: 0,
						author_id: props.userId,
						thread_id: props.threadId,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
						text: text,
					},
				},
				{
					type: "set",
					table: "thread",
					id: props.threadId,
					key: ["replied_at"],
					value: new Date().toISOString(),
				},
			],
		})
		setText("")
	}

	return (
		<input
			type="text"
			placeholder="New message..."
			value={text}
			onChange={(e) => setText(e.target.value)}
			onKeyDown={(e) => {
				if (e.key === "Enter" && text !== "") onSubmit()
			}}
		/>
	)
}

function ThreadItem(props: { threadId: string; selected: boolean; onClick: () => void }) {
	const thread = useRecord({ table: "thread", id: props.threadId })
	if (!thread) throw new Error("Could not find thread.")

	return (
		<div
			onClick={props.onClick}
			style={{
				border: props.selected ? "2px solid blue" : "2px solid transparent",
				boxSizing: "border-box",
			}}
		>
			{thread.subject}
		</div>
	)
}

function ThreadMessages(props: { userId: string; threadId: string }) {
	const thread = useRecord({ table: "thread", id: props.threadId })
	if (!thread) throw new Error("Could not find thread.")

	const messages = thread.message_ids || []
	return (
		<>
			<ThreadMembersInput threadId={thread.id} userId={props.userId} />
			<ThreadSubjectInput threadId={thread.id} userId={props.userId} />
			{messages.map((id) => (
				<Message messageId={id} />
			))}
			<NewMessageInput threadId={thread.id} userId={props.userId} />
		</>
	)
}

function Message(props: { messageId: string }) {
	const message = useRecord({ table: "message", id: props.messageId })
	if (!message) throw new Error("Could not find message.")

	message.author_id
	return (
		<div>
			<strong>
				<Username userId={message.author_id} />:
			</strong>
			<span>{message.text}</span>
		</div>
	)
}

function Username(props: { userId: string }) {
	const user = useRecord({ table: "user", id: props.userId })
	if (!user) throw new Error("Could not find user.")
	return <span>{user.username}</span>
}

function Login(props: { onLogin: () => void }) {
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState("")

	const { api } = useClientEnvironment()

	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault()
				setError("")
				const response = await api.login({ username, password })
				console.log("HERE", response)
				if (response.status !== 200) setError(response.body.message)
				else props.onLogin()
			}}
		>
			<input
				style={{ display: "block" }}
				type="text"
				placeholder="username"
				value={username}
				onChange={(e) => setUsername(e.target.value)}
			></input>
			<input
				style={{ display: "block" }}
				type="password"
				placeholder="password"
				value={password}
				onChange={(e) => setPassword(e.target.value)}
			></input>
			{error && <div style={{ color: "red" }}>{error}</div>}
			<button type="submit">Login or Signup</button>
		</form>
	)
}
