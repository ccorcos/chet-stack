import { useClientEnvironment } from "client/services/ClientEnvironment"
import React, { useEffect, useRef, useState } from "react"
import { PrimaryButton } from "ui/components/Button"
import { Input } from "ui/components/Input"

type Message = {
	name: string
	text: string
	timestamp: number
}

function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState(value)

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			setDebouncedValue(value)
		}, delay)

		return () => clearTimeout(timeoutId)
	}, [value, delay])

	return debouncedValue
}

export function PubsubDemo() {
	const { pubsub } = useClientEnvironment()
	const [name, setName] = useState("anonymous")
	const [room, setRoom] = useState("")
	const [messages, setMessages] = useState<Message[]>([])
	const [messageInput, setMessageInput] = useState("")
	const messagesEndRef = useRef<HTMLDivElement>(null)

	const debouncedRoom = useDebounce(room.trim() || "default", 300)

	// Subscribe to debounced room
	useEffect(() => {
		pubsub.subscribe(debouncedRoom)

		return () => {
			pubsub.unsubscribe(debouncedRoom)
		}
	}, [debouncedRoom])

	// Clear messages when room changes
	const prevRoomRef = useRef<string | null>(null)
	useEffect(() => {
		if (debouncedRoom !== prevRoomRef.current) {
			setMessages([])
			prevRoomRef.current = debouncedRoom
		}
	}, [debouncedRoom])

	// Listen for messages
	useEffect(() => {
		const unsubscribe = pubsub.onMessage((key: string, value: any) => {
			if (key === debouncedRoom) {
				setMessages((prev) => [...prev, value])
			}
		})
		return unsubscribe
	}, [debouncedRoom])

	// Auto-scroll to bottom
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
	}, [messages])

	const handleSendMessage = () => {
		if (!messageInput.trim()) return

		const message: Message = {
			name: name.trim() || "anonymous",
			text: messageInput,
			timestamp: Date.now(),
		}

		const targetRoom = room.trim() || "default"
		pubsub.publish(targetRoom, message)
		setMessageInput("")
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSendMessage()
		}
	}

	return (
		<div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
			{/* Top bar */}
			<div style={{ padding: 16, display: "flex", gap: 8, borderBottom: "1px solid var(--bg2)" }}>
				<Input
					placeholder="Name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					style={{ flex: 1 }}
				/>
				<Input
					placeholder="Room"
					value={room}
					onChange={(e) => setRoom(e.target.value)}
					style={{ flex: 1 }}
				/>
			</div>

			{/* Messages */}
			<div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
				{messages.length === 0 ? (
					<div style={{ color: "var(--fg2)", textAlign: "center", marginTop: 32 }}>
						No messages yet. Be the first to send one!
					</div>
				) : (
					messages.map((msg, i) => (
						<div
							key={i}
							style={{
								marginBottom: 12,
								padding: 8,
								background: "var(--bg1)",
								borderRadius: 4,
							}}
						>
							<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
								<strong style={{ color: "var(--fg0)" }}>{msg.name}</strong>
								<span style={{ color: "var(--fg2)", fontSize: "0.85em" }}>
									{new Date(msg.timestamp).toLocaleTimeString()}
								</span>
							</div>
							<div style={{ color: "var(--fg1)" }}>{msg.text}</div>
						</div>
					))
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Bottom input */}
			<div style={{ padding: 16, display: "flex", gap: 8, borderTop: "1px solid var(--bg2)" }}>
				<Input
					placeholder="Type a message..."
					value={messageInput}
					onChange={(e) => setMessageInput(e.target.value)}
					onKeyDown={handleKeyDown}
					style={{ flex: 1 }}
				/>
				<PrimaryButton onClick={handleSendMessage} disabled={!messageInput.trim()}>
					Send
				</PrimaryButton>
			</div>
		</div>
	)
}
