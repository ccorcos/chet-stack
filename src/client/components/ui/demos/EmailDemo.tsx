import React, { useCallback, useRef, useState } from "react"
import { randomId } from "../../../../shared/randomId"
import { useListJSON, useWriteJSON } from "../../../hooks/useDatabase"
import { useInputFocus } from "../../../hooks/useInputFocus"
import { isShortcut } from "../../../hooks/useShortcut"
import { Badge } from "../Badge"
import { Button, PrimaryButton } from "../Button"
import { Input } from "../Input"
import { ContentLayout, Layout, RightPanelLayout, TopbarLayout } from "../Layout"
import { ListBox, ListItem, useListBox } from "../ListBox"
import { MenuItem } from "../MenuItem"
import { Popup, PopupFrame } from "../Popup"

export function EmailDemo() {
	const [username, setUsername] = useState<string | undefined>("chet")
	const [selected, setSelected] = useState<string | undefined>(undefined)

	const [compose, setCompose] = useState(false)

	return (
		<Layout
			Topbar={
				<TopbarLayout
					show={Boolean(username)}
					style={{ display: "flex", padding: 8, justifyContent: "flex-end", alignItems: "center" }}
				>
					<div>
						<Button onClick={() => setCompose(true)}>Compose</Button>
					</div>
				</TopbarLayout>
			}
			RightPanel={
				username && (
					<RightPanelLayout show={Boolean(compose)}>
						<Compose from={username} />
					</RightPanelLayout>
				)
			}
		>
			<ContentLayout>
				{!username && (
					<FakeLogin
						username={username}
						onLogin={setUsername}
						onLogout={() => setUsername(undefined)}
					/>
				)}

				{username && <Inbox username={username} selected={selected} setSelected={setSelected} />}
			</ContentLayout>
		</Layout>
	)
}

function FakeLogin(props: {
	username: string | undefined
	onLogin: (username: string) => void
	onLogout: () => void
}) {
	const [username, setUsername] = useState("")

	if (props.username) {
		return (
			<div>
				Logged in as {props.username}. <button onClick={props.onLogout}>Logout</button>
			</div>
		)
	}

	const write = useWriteJSON()
	const onLogin = () => {
		if (username.trim() === "") return
		props.onLogin(username)
		write({ set: [{ key: `user:${username}`, value: { username } as User }] })
		setUsername("")
	}

	return (
		<div
			style={{
				display: "flex",
				padding: 8,
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 8,
				}}
			>
				<h3 style={{ margin: 0 }}>Welcome to Comms</h3>
				<p style={{ margin: 0 }}>Please sign up with a fake username.</p>
				<Input
					type="text"
					placeholder="Username"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") onLogin()
					}}
				/>
				<div>
					<PrimaryButton onClick={onLogin}>Login</PrimaryButton>
				</div>
			</div>
		</div>
	)
}

type Email = {
	id: string
	timestamp: string
	from: string
	to: string[]
	subject: string
	body: string
}

type Draft = {
	to: string[]
	subject: string
	body: string
}

type User = {
	username: string
}

function Inbox(props: {
	username: string
	selected: string | undefined
	setSelected: (selected: string | undefined) => void
}) {
	const { localResult, remoteResult } = useListJSON({
		gt: `inbox:${props.username}`,
		lt: `inbox:${props.username}\xff`,
	})
	remoteResult.suspend()

	const results = localResult.prefix || localResult.hit || []
	const emails = results.map(({ value }) => value as Email)

	const { onClick, onKeyDown } = useListBox({
		multiselect: false,
		selected: props.selected,
		setSelected: props.setSelected,
		list: emails.map((email) => email.id),
	})

	return (
		<div>
			<div>Inbox</div>
			{emails.length === 0 && <div>No emails</div>}
			<ListBox onClick={onClick} onKeyDown={onKeyDown}>
				{emails.map((email) => (
					<ListItem
						key={email.id}
						item={email.id}
						selected={props.selected === email.id}
						onKeyDown={(e) => {
							if (isShortcut("delete", e.nativeEvent)) {
								e.preventDefault()
								// TODO
							}
						}}
					>
						{email.from} - {email.subject}
					</ListItem>
				))}
			</ListBox>
		</div>
	)
}

function Compose(props: { from: string }) {
	const [draft, setDraft] = useState<Draft>({ to: [], subject: "", body: "" })

	const write = useWriteJSON()
	const send = () => {
		const email: Email = {
			id: randomId(),
			timestamp: new Date().toISOString(),
			from: props.from,
			...draft,
		}

		write({
			set: [
				...email.to.map((to) => ({
					key: `inbox:${to}:${email.timestamp}:${email.id}`,
					value: email,
				})),
				{ key: `send:${email.from}:${email.timestamp}:${email.id}`, value: email },
			],
		})
		setDraft({ to: [], subject: "", body: "" })
	}

	return (
		<div>
			<div>
				{draft.to.map((item) => (
					<Badge key={item}>{item}</Badge>
				))}
				<SearchUser
					onSubmit={(username) => setDraft({ ...draft, to: [...draft.to, username] })}
					onDelete={() => setDraft({ ...draft, to: draft.to.slice(0, -1) })}
				/>
			</div>
			<Input
				placeholder="Subject..."
				value={draft.subject}
				onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
			/>
			<textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />

			<Button onClick={send}>Send</Button>
		</div>
	)
}

function SearchUser(props: { onSubmit: (username: string) => void; onDelete: () => void }) {
	const [query, setQuery] = useState("")

	const { localResult, remoteResult } = useListJSON({
		gte: `user:${query}`,
		lt: `user:${query}\xff`,
	})

	const loading = !remoteResult.resolved
	const results = localResult.prefix || localResult.hit || []
	const users = results.map(({ value }) => value as User)

	const { focused, onFocus, onBlur } = useInputFocus()
	const inputRef = useRef<HTMLInputElement>(null)

	const [selectedIndex, setSelectedIndex] = useState(0)

	const handleKeydown = useCallback(
		(event: React.KeyboardEvent) => {
			if (isShortcut("down", event.nativeEvent)) {
				event.preventDefault()
				setSelectedIndex((i) => {
					if (i >= users.length - 1) return users.length - 1
					else return i + 1
				})
				return
			}
			if (isShortcut("up", event.nativeEvent)) {
				event.preventDefault()
				setSelectedIndex((i) => {
					if (i === 0) return i
					else return i - 1
				})
				return
			}
			if (isShortcut("enter", event.nativeEvent)) {
				event.preventDefault()
				if (users[selectedIndex]) {
					props.onSubmit(users[selectedIndex].username)
				}
				return
			}
			if (isShortcut("escape", event.nativeEvent)) {
				event.preventDefault()
				// TODO?
				return
			}
		},
		[users, selectedIndex, props]
	)

	return (
		<>
			<Input
				ref={inputRef}
				placeholder="To..."
				onFocus={onFocus}
				onBlur={onBlur}
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				onKeyDown={(e) => {
					if (isShortcut("backspace", e.nativeEvent) && query === "") {
						e.preventDefault()
						props.onDelete()
					} else {
						return handleKeydown(e)
					}
				}}
			/>
			<Popup open={focused} anchor={inputRef.current}>
				<PopupFrame>
					{loading
						? "Loading..."
						: users.map(({ username }, i) => (
								<MenuItem
									key={username}
									selected={selectedIndex === i}
									onClick={() => props.onSubmit(username)}
									onMouseDown={(e) => e.preventDefault()}
									onMouseEnter={() => setSelectedIndex(i)}
								>
									{username}
								</MenuItem>
						  ))}
				</PopupFrame>
			</Popup>
		</>
	)
}
