import { formatRelative } from "date-fns"
import { flatten } from "lodash"
import React, {
	Suspense,
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react"
import { randomId } from "../../shared/randomId"
import { setRecordMap } from "../../shared/recordMapHelpers"
import { RecordMap, RecordPointer, RecordTable } from "../../shared/schema"
import { Transaction, op } from "../../shared/transaction"
import { redo, undo, write } from "../actions/write"
import { nextFocusable, prevFocusable } from "../helpers/focusHelpers"
import { mergeEvents } from "../helpers/mergeEvents"
import { useAsync } from "../hooks/useAsync"
import { GET_MESSAGES_LIMIT, GET_MESSAGES_STEP, useMessages } from "../hooks/useMessages"
import { useRecord } from "../hooks/useRecord"
import { isShortcut, useShortcut } from "../hooks/useShortcut"
import { GET_THREADS_LIMIT, GET_THREADS_STEP, useThreads } from "../hooks/useThreads"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { useRoute } from "../services/Router"
import { formatResponseError } from "../services/api"
import { FileUpload, FileUploadDropZone, UploadPreview, useFileUpload } from "./FileUpload"
import { Link } from "./Link"
import { useRecordInspector } from "./RecordInspector"
import { Throttle } from "./Throttle"
import { Button } from "./ui/Button"
import { Input } from "./ui/Input"
import { ListBox, ListItem } from "./ui/ListBox"
import { MenuItem } from "./ui/MenuItem"
import { Popup, PopupFrame } from "./ui/Popup"
import { Spinner } from "./ui/Spinner"

function useIsPendingWrite<T extends RecordTable>(pointer: RecordPointer<T>) {
	const { transactionQueue } = useClientEnvironment()

	const subscribe = useCallback(
		(update: () => void) => {
			return transactionQueue.subscribeIsPendingWrite(pointer, update)
		},
		[pointer.table, pointer.id]
	)

	const getSnapshot = useCallback(() => {
		return transactionQueue.isPendingWrite(pointer)
	}, [pointer.table, pointer.id])

	const record = useSyncExternalStore(subscribe, getSnapshot)

	return record
}

export function App(props: { userId: string }) {
	const environment = useClientEnvironment()

	// TODO: not sure why typescript is being annoying.
	const user = useRecord({ table: "user", id: props.userId })
	if (!user) throw new Error("Could not load user.")

	const [limit, setLimit] = useState(GET_THREADS_LIMIT)
	const loadMore = () => setLimit((n) => n + GET_THREADS_STEP)

	const { threadIds, nextId, loadingMore } = useThreads(props.userId, limit)

	useShortcut("cmd-z", () => undo(environment))
	useShortcut("cmd-shift-z", () => redo(environment))

	const route = useRoute()

	const selectedThreadId = route.type === "thread" ? route.threadId : undefined

	const setSelectedThreadId = (threadId: string) => {
		environment.router.navigate({ type: "thread", threadId })
	}

	useEffect(() => {
		if (selectedThreadId === undefined && threadIds[0]) {
			environment.router.navigate({ type: "thread", threadId: threadIds[0] })
		}
	}, [selectedThreadId === undefined && threadIds[0]])

	// const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(threadIds[0])

	const onNewThread = () => {
		const id = randomId()

		const transction: Transaction = {
			txId: randomId(),
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
			],
		}
		// Write to the transaction queue.
		write(environment, transction).catch(console.error)

		// Set this as the current thread.
		setSelectedThreadId(id)
	}

	return (
		<div style={{ display: "flex", height: "100vh" }}>
			{/* SidePanel */}
			<SidebarContainer>
				<SidebarTop onNewThread={onNewThread} />
				<SidebarThreadsList
					selectedThreadId={selectedThreadId}
					setSelectedThreadId={setSelectedThreadId}
					threadIds={threadIds}
					nextThreadId={nextId}
					onLoadMore={loadMore}
					loadingMore={loadingMore}
				/>
			</SidebarContainer>

			{/* ContentPanel */}
			<ContentContainer>
				{selectedThreadId ? (
					<ThreadDetails userId={user.id} threadId={selectedThreadId} />
				) : (
					<div style={{ padding: "1em 0em" }}>Select a thread...</div>
				)}
			</ContentContainer>
		</div>
	)
}

function SidebarContainer(props: { children: React.ReactNode }) {
	return (
		<div
			style={{
				width: "18em",
				display: "flex",
				flexDirection: "column",
				backgroundColor: "var(--background2)",
				padding: "0.5em",
			}}
		>
			{props.children}
		</div>
	)
}

function SidebarTop(props: { onNewThread: () => void }) {
	return (
		<div style={{ display: "flex", alignItems: "center", paddingBottom: "0.5em" }}>
			<OfflineBadge />
			<div style={{ flexGrow: 1 }}></div>
			<Button onClick={props.onNewThread}>New Thread</Button>
		</div>
	)
}

function SidebarThreadsList(props: {
	threadIds: string[]
	selectedThreadId: string | undefined
	setSelectedThreadId: (threadId: string) => void
	nextThreadId: string
	onLoadMore: () => void
	loadingMore: boolean
}) {
	const {
		threadIds,
		selectedThreadId,
		setSelectedThreadId,
		nextThreadId,
		onLoadMore,
		loadingMore,
	} = props
	return (
		<div
			style={{
				overflow: "auto",
				display: "flex",
				flexDirection: "column",
				gap: "0.25em",
			}}
		>
			<ListBox
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					gap: "0.25em",
				}}
				items={threadIds}
				selectedIndex={selectedThreadId ? threadIds.indexOf(selectedThreadId) : undefined}
				onSelectIndex={(index) => setSelectedThreadId(threadIds[index])}
			>
				{(threadId, props) => <SidebarThreadItem threadId={threadId} {...props} />}
			</ListBox>

			{nextThreadId && (
				<>
					{/* Render so that we retain the object. */}
					<div style={{ display: "none" }}>
						<SidebarThreadItem
							threadId={nextThreadId}
							selected={false}
							focused={false}
							onClick={() => {}}
							onKeyDown={() => {}}
						/>
					</div>
					<div style={{ textAlign: "center" }}>
						<Button onClick={onLoadMore}>Load More</Button>
					</div>
				</>
			)}
			{loadingMore && (
				<div style={{ textAlign: "center" }}>
					<Spinner />
				</div>
			)}
		</div>
	)
}

function SidebarThreadItem(props: {
	threadId: string
	selected?: boolean
	focused?: boolean
	onClick: React.MouseEventHandler
	onKeyDown: React.KeyboardEventHandler
}) {
	const thread = useRecord({ table: "thread", id: props.threadId })
	if (!thread) throw new Error("Could not find thread.")

	const { inspectPane, onClick } = useRecordInspector({ table: "thread", id: props.threadId })

	return (
		<ListItem
			selected={props.selected}
			onClick={mergeEvents(onClick, props.onClick)}
			onKeyDown={props.onKeyDown}
			style={{
				padding: "0.25em 0.5em",
				borderRadius: "0.2em",
				display: "flex",
				flexDirection: "column",
				gap: "0.25em",
			}}
		>
			{inspectPane}

			<div style={{ display: "flex", alignItems: "end", gap: "0.5em" }}>
				<div style={{ flex: 1 }}>
					<strong>
						{joinElements(
							thread.member_ids.map((userId) => <Username userId={userId} key={userId} />),
							(key) => (
								<span key={key}>, </span>
							)
						)}
					</strong>
				</div>
				<div style={{ fontSize: "0.7em" }}>{formatDate(thread.replied_at)}</div>
			</div>
			<div>{thread.subject}</div>
		</ListItem>
	)
}

function useOnline() {
	// TODO: an improved online/offline detector would ping the server to see if its online.
	// When the browser is online, but the server is down, this still says online.
	const [state, setState] = useState(navigator.onLine)
	useEffect(() => {
		const setOnline = () => setState(true)
		const setOffline = () => setState(false)
		window.addEventListener("online", setOnline)
		window.addEventListener("offline", setOffline)
		return () => {
			window.removeEventListener("online", setOnline)
			window.removeEventListener("offline", setOffline)
		}
	}, [])
	return state
}

function OfflineBadge() {
	const online = useOnline()
	return (
		<Badge style={{ backgroundColor: online ? undefined : "var(--orange)" }}>
			{online ? "Online" : <strong>Offline</strong>}
		</Badge>
	)
}

function ContentContainer(props: { children: React.ReactNode }) {
	return (
		<div
			style={{
				flex: 1,
				display: "flex",
				flexDirection: "column",
				padding: "0.5em 1em",
				gap: "0.25em",
			}}
		>
			<div style={{ position: "absolute", top: 0, right: 0, padding: "10px 18px" }}>
				<Link style={{ fontSize: "0.8em" }} route={{ type: "logout" }}>
					Logout
				</Link>
			</div>
			<Suspense
				fallback={
					<div style={{ textAlign: "center", paddingTop: "2em" }}>
						<Spinner />
					</div>
				}
			>
				{props.children}
			</Suspense>
		</div>
	)
}

function ThreadMembersInput(props: { userId: string; threadId: string }) {
	const thread = useRecord({ table: "thread", id: props.threadId })
	if (!thread) throw new Error("Could not find thread.")

	const environment = useClientEnvironment()

	const div = useRef<HTMLDivElement>(null)

	const handleDivKeydown = (event: React.KeyboardEvent) => {
		if (!div.current) return
		if (isShortcut("right", event.nativeEvent)) {
			event.preventDefault()
			nextFocusable(div.current)?.focus()
		}
		if (isShortcut("left", event.nativeEvent)) {
			event.preventDefault()
			prevFocusable(div.current)?.focus()
		}
	}

	return (
		<div ref={div} onKeyDown={handleDivKeydown}>
			To:{" "}
			{joinElements(
				thread.member_ids.map((userId) => {
					return (
						<Badge
							tabIndex={-1}
							onKeyDown={(event) => {
								if (isShortcut("delete", event.nativeEvent)) {
									event.preventDefault()
									if (div.current) prevFocusable(div.current)?.focus()
									write(environment, {
										txId: randomId(),
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
									return
								}
							}}
						>
							<Username userId={userId} key={userId} />
						</Badge>
					)
				}),
				(key) => (
					<span key={key}> </span>
				)
			)}{" "}
			<span>
				<SearchUsersInput
					placeholder="Add member..."
					ignoreUserIds={thread.member_ids}
					onSubmit={(userId) => {
						write(environment, {
							txId: randomId(),
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
			</span>
		</div>
	)
}

function SearchUsersInput(props: {
	placeholder?: string
	onSubmit: (userId: string) => void
	ignoreUserIds?: string[]
}) {
	const environment = useClientEnvironment()

	const [text, setText] = useState("")

	const searchUsersApi = useCallback(async (args: { query: string }) => {
		if (args.query === "") {
			return { query: args.query, userIds: [] }
		}
		const response = await environment.api.searchUsers(args)
		if (response.status === 200) {
			const { recordMap } = response.body
			environment.recordCache.writeRecordMap(recordMap)
			environment.recordStorage.writeRecordMap(recordMap)
			return { query: args.query, userIds: response.body.userIds }
		} else {
			return { query: args.query, userIds: [], error: formatResponseError(response) }
		}
	}, [])

	const searchUsersStorage = useCallback(async (args: { query: string }) => {
		if (args.query === "") {
			return { query: args.query, userIds: [] }
		}
		const result = await environment.recordStorage.searchUsers(args)

		const recordMap: RecordMap = {}
		for (const user of result) {
			setRecordMap(recordMap, { table: "user", id: user.id }, user)
		}
		environment.recordCache.writeRecordMap(recordMap)
		environment.recordStorage.writeRecordMap(recordMap)

		return { query: args.query, userIds: result.map((user) => user.id) }
	}, [])

	const apiResult = useAsync(searchUsersApi, [{ query: text }])
	const storageResult = useAsync(searchUsersStorage, [{ query: text }])

	let error: string | undefined
	let userIds: string[] | undefined
	if (apiResult && apiResult.query === text) {
		error = apiResult.error
		userIds = apiResult.userIds
	} else if (storageResult && storageResult.query === text) {
		userIds = storageResult.userIds
	}

	if (userIds && props.ignoreUserIds) {
		const ignore = new Set(props.ignoreUserIds)
		userIds = userIds.filter((userId) => !ignore.has(userId))
	}

	const inputRef = useRef<HTMLInputElement>(null)
	const [focused, setFocused] = useState(false)

	const [selectedIndex, setSelectedIndex] = useState(0)

	const onChange = (userId: string) => {
		props.onSubmit(userId)
		setText("")
	}

	const onDismiss = () => {
		inputRef.current?.blur()
	}

	const items = userIds || []

	const handleInputKeydown = (event: React.KeyboardEvent) => {
		if (isShortcut("down", event.nativeEvent)) {
			event.preventDefault()
			setSelectedIndex((i) => {
				if (i >= items.length - 1) return items.length - 1
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
			if (items[selectedIndex]) {
				onChange(items[selectedIndex])
			}
			return
		}
		if (isShortcut("escape", event.nativeEvent)) {
			event.preventDefault()
			onDismiss()
			return
		}
	}

	return (
		<>
			<Input
				ref={inputRef}
				onFocus={() => setFocused(true)}
				onBlur={() => {
					setFocused(false)
					onDismiss()
				}}
				placeholder={props.placeholder}
				value={text}
				onChange={(e) => {
					setText(e.target.value)
					setSelectedIndex(0)
				}}
				onKeyDown={handleInputKeydown}
			/>

			<Popup open={focused && text.length > 0} anchor={inputRef.current} onDismiss={onDismiss}>
				<PopupFrame style={{ minWidth: "10em" }}>
					<Throttle showSpinner={!error && !userIds} spinner={<Spinner />}>
						{error ? (
							<span style={{ color: "var(--red)" }}>{error}</span>
						) : userIds && userIds.length === 0 ? (
							"No results..."
						) : (
							items.map((userId, i) => (
								<MenuItem
									selected={selectedIndex === i}
									onClick={() => onChange(userId)}
									onMouseDown={(e) => e.preventDefault()}
									onMouseEnter={() => setSelectedIndex(i)}
								>
									<Username userId={userId} />
								</MenuItem>
							))
						)}
					</Throttle>
				</PopupFrame>
			</Popup>
		</>
	)
}

function ThreadSubjectInput(props: { userId: string; threadId: string }) {
	const thread = useRecord({ table: "thread", id: props.threadId })
	if (!thread) throw new Error("Could not find thread.")

	const environment = useClientEnvironment()

	return (
		<div style={{ display: "flex", alignItems: "center", gap: "0.5em" }}>
			<div>Subject:</div>

			<Input
				className="subject"
				style={{ flex: 1 }}
				type="text"
				value={thread.subject}
				onChange={(e) => {
					const newSubject = e.target.value
					write(environment, {
						txId: randomId(),
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
		</div>
	)
}

function NewMessageInput(props: { userId: string; threadId: string }) {
	const environment = useClientEnvironment()

	const [text, setText] = useState("")
	const { uploads, handleDrop, reset } = useFileUpload()

	const onSubmit = () => {
		const messageId = randomId()
		write(environment, {
			txId: randomId(),
			authorId: props.userId,
			operations: [
				op.create("message", {
					id: messageId,
					version: 0,
					author_id: props.userId,
					thread_id: props.threadId,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
					text: text,
					file_ids: uploads.map((upload) => upload.id),
				}),
				{
					type: "set",
					table: "thread",
					id: props.threadId,
					key: ["replied_at"],
					value: new Date().toISOString(),
				},
				...flatten(
					uploads.map(({ id }) => [
						op.update({ table: "file", id }, "parent_table", "message"),
						op.update({ table: "file", id }, "parent_id", props.threadId),
					])
				),
			],
		})
		setText("")
		reset()
	}

	return (
		<FileUploadDropZone onDrop={handleDrop}>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "0.5em",
				}}
			>
				<Input
					style={{ flex: 1 }}
					type="text"
					className="reply"
					placeholder="New message..."
					value={text}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && text !== "") onSubmit()
					}}
				/>
				<Button disabled={text.length === 0 && uploads.length === 0} onClick={onSubmit}>
					Send
				</Button>
			</div>

			{uploads.length > 0 && (
				<div style={{ display: "inline-flex", flexWrap: "wrap", gap: 12, padding: 12 }}>
					{uploads.map((upload) => (
						<UploadPreview key={upload.id} {...upload} />
					))}
				</div>
			)}
		</FileUploadDropZone>
	)
}

function ThreadDetails(props: { userId: string; threadId: string }) {
	const { threadId, userId } = props

	const [limit, setLimit] = useState(GET_MESSAGES_LIMIT)
	const loadMore = () => setLimit((n) => n + GET_MESSAGES_STEP)

	const { messageIds, nextId, loadingMore } = useMessages(threadId, limit)

	return (
		<>
			<ThreadMembersInput threadId={threadId} userId={userId} />
			<ThreadSubjectInput threadId={threadId} userId={userId} />
			<div style={{ flex: 1, display: "flex", flexDirection: "column-reverse", overflow: "auto" }}>
				{messageIds && messageIds.map((id) => <Message messageId={id} key={id} />)}
				{loadingMore && <div style={{ color: "green" }}>Loading...</div>}
				{nextId && (
					<>
						{/* Render so that we retain the object. */}
						<div style={{ display: "none" }}>
							<Message messageId={nextId} />
						</div>
						<Button onClick={loadMore}>Load More</Button>
					</>
				)}
			</div>
			<NewMessageInput threadId={threadId} userId={userId} />
		</>
	)
}

function Message(props: { messageId: string }) {
	const message = useRecord({ table: "message", id: props.messageId })
	if (!message) throw new Error("Could not find message.")

	const pending = useIsPendingWrite({ table: "message", id: message.id })

	const { onClick, inspectPane } = useRecordInspector({ table: "message", id: message.id })

	return (
		<div className="message" onClick={onClick}>
			{inspectPane}
			<strong>
				<Username userId={message.author_id} />:
			</strong>
			<span style={{ color: pending ? "gray" : undefined }}>{message.text}</span>
			{message.file_ids && message.file_ids.length > 0 && (
				<div style={{ display: "inline-flex", flexWrap: "wrap", gap: 12, padding: 12 }}>
					{message.file_ids?.map((id) => <FileUpload fileId={id} key={id} />)}
				</div>
			)}
		</div>
	)
}

function Username(props: { userId: string }) {
	const user = useRecord({ table: "user", id: props.userId })
	if (!user) throw new Error("Could not find user.")
	return <span>{user.username}</span>
}

function joinElements(elements: JSX.Element[], sep: (key: string) => JSX.Element) {
	const [first, ...rest] = elements
	const result = [first]
	for (let i = 0; i < rest.length; i++) {
		result.push(sep("sep-" + i))
		result.push(rest[i])
	}
	return result
}

function formatDate(isoDate: string) {
	const now = new Date()
	const target = new Date(isoDate)
	return formatRelative(target, now)
}

function Badge(props: {
	children: React.ReactNode
	style?: React.CSSProperties
	onClick?: React.MouseEventHandler
	onKeyDown?: React.KeyboardEventHandler
	tabIndex?: 0 | -1
}) {
	return (
		<div
			style={{
				display: "inline-block",
				fontSize: "0.8em",
				padding: "0.2em 0.4em",
				borderRadius: "0.2em",
				backgroundColor: "var(--gray3)",
				...props.style,
			}}
			tabIndex={props.tabIndex}
			onClick={props.onClick}
			onKeyDown={props.onKeyDown}
		>
			{props.children}
		</div>
	)
}
