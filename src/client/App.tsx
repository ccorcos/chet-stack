import { groupBy, mapValues } from "lodash"
import React, { useState } from "react"
import { useClientEnvironment } from "./ClientEnvironment"

export function App() {
	return <Login />
}

function parseCookies(cookie: string) {
	console.log(1, cookie)
	const entries = cookie.split(";").map((line) => line.split("="))
	const grouped = groupBy(entries, (entry) => entry[0])
	const cookies = mapValues(grouped, (entries) => entries.map((entry) => entry[1]))
	return cookies
}

function Login() {
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState("")

	const { api } = useClientEnvironment()

	// Parse cookies.
	const cookies = parseCookies(document.cookie)
	const userId = cookies.userId?.[0]
	console.log("HERE", cookies, userId)

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
