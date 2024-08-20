import { capitalize } from "lodash"
import React, { useState } from "react"
import { getCurrentUserId } from "../helpers/getCurrentUserId"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { formatResponseError } from "../services/api"
import { Button } from "./ui/Button"
import { Input } from "./ui/Input"

function LoginForm(props: { type: "login" | "signup" }) {
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState("")

	const environment = useClientEnvironment()

	async function handleLogin() {
		setError("")
		const response = await environment.api[props.type]({ username, password })
		if (response.status === 200) {
			const { recordMap } = response.body
			environment.recordCache.writeRecordMap(recordMap)
			environment.recordStorage.writeRecordMap(recordMap)
			environment.router.navigate({ type: "root" })
		} else {
			setError(formatResponseError(response))
		}
	}

	return (
		<form
			className={props.type}
			onSubmit={async (e) => {
				e.preventDefault()
				handleLogin()
			}}
			style={{ display: "flex", flexDirection: "column", maxWidth: "16em", gap: 8 }}
		>
			<Input
				type="text"
				placeholder="username"
				className="username"
				value={username}
				onChange={(e) => setUsername(e.target.value)}
			></Input>
			<Input
				type="password"
				placeholder="password"
				value={password}
				onChange={(e) => setPassword(e.target.value)}
			></Input>
			{error && <div style={{ color: "red" }}>{error}</div>}
			<Button type="submit">{capitalize(props.type)}</Button>
		</form>
	)
}

function useRedirectIfLoggedIn() {
	const { router } = useClientEnvironment()
	const userId = getCurrentUserId()
	if (userId) throw Promise.resolve().then(() => router.navigate({ type: "root" }))
}

export function Login() {
	useRedirectIfLoggedIn()

	return (
		<div style={{ maxWidth: "42em", margin: "4em auto" }}>
			<h3>Login</h3>
			<LoginForm type="login" />

			<h3>Sign up</h3>
			<LoginForm type="signup" />
		</div>
	)
}
