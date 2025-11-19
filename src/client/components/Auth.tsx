import React, { useState } from "react"
import { getCurrentUserId } from "../../auth/client"
import { useClientEnvironment } from "../services/ClientEnvironment"

export function Auth() {
	const [userId, setUserId] = useState<string | undefined>(getCurrentUserId())

	return (
		<div>
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
					<input
						type="text"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						required
					/>
				</div>
				<div>
					<label>Password</label>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>
				<button type="submit">Login</button>
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
					<input
						type="text"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						required
					/>
				</div>
				<div>
					<label>Password</label>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>
				<button type="submit">Signup</button>
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
			<button onClick={handleLogout}>Logout</button>
		</div>
	)
}
