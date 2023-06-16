import { groupBy, mapValues } from "lodash"
import React, { Suspense, useCallback, useState, useSyncExternalStore } from "react"
import { RecordPointer, RecordTable } from "../shared/schema"
import { useClientEnvironment } from "./ClientEnvironment"

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

function parseCookies(cookie: string) {
	const entries = cookie.split(";").map((line) => line.split("="))
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
	// TODO: not sure why typescript is being annoying.
	const user = useRecord<"user">({ table: "user", id: props.userId })
	if (!user) throw new Error("Could not load user.")

	const userSettings = useRecord<"user_settings">({ table: "user_settings", id: props.userId })
	if (!userSettings) throw new Error("Could not load user settings.")

	const [thread, setThread] = useState<string | undefined>(userSettings.thread_ids?.[0])

	const threadIds = userSettings.thread_ids || []

	return (
		<div style={{ display: "flex" }}>
			<div style={{ width: 200, display: "flex", flexDirection: "column" }}>
				{threadIds.map((id) => (
					<ThreadItem threadId={id} selected={id === thread} />
				))}
			</div>
			<div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
				{thread ? <ThreadMessages threadId={thread} /> : "Select a thread"}
			</div>
		</div>
	)
}

function ThreadItem(props: { threadId: string; selected: boolean }) {
	const thread = useRecord<"thread">({ table: "thread", id: props.threadId })
	if (!thread) throw new Error("Could not find thread.")

	return (
		<div
			style={{
				border: props.selected ? "2px solid blue" : "2px solid transparent",
				boxSizing: "border-box",
			}}
		>
			{thread.subject}
		</div>
	)
}

function ThreadMessages(props: { threadId: string }) {
	const thread = useRecord<"thread">({ table: "thread", id: props.threadId })
	if (!thread) throw new Error("Could not find thread.")

	const messages = thread.message_ids || []
	return (
		<>
			{messages.map((id) => (
				<Message messageId={id} />
			))}
		</>
	)
}

function Message(props: { messageId: string }) {
	const message = useRecord<"message">({ table: "message", id: props.messageId })
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
	const user = useRecord<"user">({ table: "user", id: props.userId })
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
