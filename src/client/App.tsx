import React, { useState } from "react"
import { httpRequest } from "./httpRequest"

function Login() {
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")

	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault()
				const response = await httpRequest("/login", { username, password })
				if (response.status !== 200) return console.error(response)
			}}
		>
			<input
				type="text"
				placeholder="username"
				value={username}
				onChange={(e) => setUsername(e.target.value)}
			></input>
			<input
				type="password"
				placeholder="password"
				value={password}
				onChange={(e) => setPassword(e.target.value)}
			></input>
			<button type="submit"></button>
		</form>
	)
}
