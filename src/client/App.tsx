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

function LoadApp() {
	// Parse cookies.
	const cookies = parseCookies(document.cookie)
	const userId = cookies.userId?.[0]
	if (!userId) return <Login />
	else return <LoadUser userId={userId} />
}

function LoadUser(props: { userId: string }) {
	// TODO: not sure why typescript is being annoying.
	const user = useRecord<"user">({ table: "user", id: props.userId })
	if (!user) throw new Error("Could not load user.")
	return <div>Hello {user.username}</div>
}

function Login() {
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
				else setError("Worked!")
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
