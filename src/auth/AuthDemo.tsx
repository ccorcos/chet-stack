import { useClientEnvironment } from "client/services/ClientEnvironment"
import React, { useState } from "react"
import { Button } from "ui/components/Button"
import { Input } from "ui/components/Input"
import { getCurrentUserId } from "./client"

export function AuthDemo() {
	const [userId, setUserId] = useState<string | undefined>(getCurrentUserId())

	return (
		<div style={{ margin: 12 }}>
			<div>{userId ? `Logged in as ${userId}` : "Logged out"}</div>
			<hr />
			<Logout setUserId={setUserId} />
			<hr />
			<Login setUserId={setUserId} />
			<hr />
			<Signup setUserId={setUserId} />
		</div>
	)
}

function Login(props: { setUserId: (userId: string) => void }) {
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState<string | null>(null)
	const { api } = useClientEnvironment()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)

		try {
			const response = await api.login({ username, password })
			if (response.status === 200) {
				props.setUserId(getCurrentUserId())
				setUsername("")
				setPassword("")
			} else {
				setError("Invalid username or password")
			}
		} catch (err) {
			setError("An error occurred. Please try again.")
		}
	}

	return (
		<div>
			<h1>Login</h1>
			{error && <div>{error}</div>}
			<form onSubmit={handleSubmit}>
				<div>
					<label>Username</label>
					<Input
						type="text"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						required
					/>
				</div>
				<div>
					<label>Password</label>
					<Input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>
				<Button type="submit">Login</Button>
			</form>
		</div>
	)
}

function Signup(props: { setUserId: (userId: string) => void }) {
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState<string | null>(null)
	const { api } = useClientEnvironment()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)

		try {
			const response = await api.signup({ username, password })
			if (response.status === 200) {
				props.setUserId(getCurrentUserId())
				setUsername("")
				setPassword("")
			} else {
				setError("Signup failed. Username may already exist.")
			}
		} catch (err) {
			setError("An error occurred. Please try again.")
		}
	}

	return (
		<div>
			<h1>Signup</h1>
			{error && <div>{error}</div>}
			<form onSubmit={handleSubmit}>
				<div>
					<label>Username</label>
					<Input
						type="text"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						required
					/>
				</div>
				<div>
					<label>Password</label>
					<Input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>
				<Button type="submit">Signup</Button>
			</form>
		</div>
	)
}

function Logout(props: { setUserId: (userId: string | undefined) => void }) {
	const [error, setError] = useState<string | null>(null)
	const { api } = useClientEnvironment()

	const handleLogout = async () => {
		setError(null)

		try {
			const response = await api.logout({})
			if (response.status === 200) {
				props.setUserId(undefined)
			} else {
				setError("Logout failed.")
			}
		} catch (err) {
			setError("An error occurred. Please try again.")
		}
	}

	return (
		<div>
			<h1>Logout</h1>
			{error && <div>{error}</div>}
			<Button onClick={handleLogout}>Logout</Button>
		</div>
	)
}
