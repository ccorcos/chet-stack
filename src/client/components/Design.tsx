import { compact } from "lodash"
import React, { useCallback, useMemo, useRef, useState } from "react"
import { FuzzyMatch, fuzzyMatch } from "../../shared/fuzzyMatch"
import { useShortcut } from "../hooks/useShortcut"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { Button } from "./Button"
import { ComboBoxSelect } from "./ComboBox"
import { DropdownMenu } from "./DropdownMenu"
import { FileUploadDropZone, UploadPreview, useFileUpload } from "./FileUpload"
import { FuzzyString } from "./FuzzyString"
import { Input } from "./Input"
import { ListBox, ListItem } from "./ListBox"
import { MenuItem } from "./MenuItem"
import { Popup, PopupFrame } from "./Popup"

/*
TODO:
- Sidebar list of the different design files.
- Shortcut to search / jump to a different design file.
- Shortcut to show / hide the sidebar.
- Various demos...
- Infinite loading list from the server.

*/

const designPages = {
	ListBoxDemo: () => <ListBoxDemo />,
	PopupDemo: () => <PopupDemo />,
	DropdownDemo: () => <DropdownDemo />,
	ComboBoxDemo: () => <ComboBoxDemo />,
	Calendar: () => <Calendar />,
	FileUploaderDemo: () => <FileUploaderDemo />,
	Form: () => <Form />,
}

export function Design(props: { page: string | undefined }) {
	const { router } = useClientEnvironment()

	const currentPage = props.page || Object.keys(designPages)[0]
	const setCurrentPage = (page: string) => router.navigate({ type: "design", page })

	return (
		<Layout
			sidebar={<Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />}
			content={designPages[currentPage]?.()}
		/>
	)
}

function Layout(props: { sidebar: React.ReactNode; content: React.ReactNode }) {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "250px 1fr",
				// gridGap: "20px",
				height: "100vh",
			}}
		>
			{props.sidebar}
			<div>{props.content}</div>
		</div>
	)
}

function Sidebar(props: { currentPage: string; setCurrentPage: (currentPage: string) => void }) {
	const pageNames = Object.keys(designPages)

	const [value, setValue] = useState("")

	const results: { pageName: string; match?: FuzzyMatch }[] = useMemo(() => {
		if (value === "") return pageNames.map((pageName) => ({ pageName }))
		return compact(
			pageNames.map((pageName) => {
				const match = fuzzyMatch(value, pageName)
				if (match) return { pageName, match }
			})
		)
	}, [value])

	const selectedIndex = useMemo(() => {
		return results.findIndex(({ pageName }) => pageName === props.currentPage)
	}, [results, props.currentPage, value])

	const setSelectedIndex = useCallback(
		(index: number) => {
			return props.setCurrentPage(results[index].pageName)
		},
		[results]
	)

	const input = useRef<HTMLInputElement>(null)

	useShortcut("cmd-p", () => {
		input.current?.focus()
	})

	return (
		<div>
			{/* <Input
				ref={input}
				type="search"
				style={{ width: "calc(100% - 1em)", margin: "0.5em" }}
				placeholder="Search..."
				value={value}
				onChange={(e) => setValue(e.target.value)}
			/> */}

			<ListBox
				items={results}
				selectedIndex={selectedIndex}
				onSelectIndex={setSelectedIndex}
				autoFocus={true}
			>
				{(item, props) => (
					<ListItem {...props} style={{ padding: "0.5em" }}>
						{item.match ? <FuzzyString match={item.match} /> : item.pageName}
					</ListItem>
				)}
			</ListBox>
		</div>
	)
}

function Form() {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "auto 1fr",
				gridGap: 8,
				alignItems: "center",
				padding: 8,
			}}
		>
			<div>Boolean</div>
			<div>
				<Input type="checkbox" />
			</div>

			<div>Number</div>
			<Input type="number" />

			<div>Text</div>
			<Input type="text" />

			<div>Date</div>
			<Input type="date" />

			<div>Select</div>
			<div>TODO</div>

			<div>Multi-Select</div>
			<div>TODO</div>

			<div>Relation</div>
			<div>TODO</div>

			<div>File</div>
			<div>TODO</div>
		</div>
	)
}

const demos = [ListBoxDemo, PopupDemo, DropdownDemo]

function ListBoxDemo() {
	return (
		<div style={{ display: "flex", gap: 24 }}>
			<MiniListbox />
			<MiniListbox />
		</div>
	)
}

function MiniListbox() {
	const items = ["apple", "orange", "lemon", "grapefruit", "cherry", "plum"]
	const [selectedIndex, setSelectedIndex] = useState<number | undefined>()

	return (
		<ListBox
			items={items}
			selectedIndex={selectedIndex}
			onSelectIndex={setSelectedIndex}
			autoFocus={true}
		>
			{(item, props) => <ListItem {...props}>{item}</ListItem>}
		</ListBox>
	)
}

function MiniPopup() {
	const buttonRef = useRef<HTMLButtonElement>(null)
	const [open, setOpen] = useState(false)

	return (
		<div>
			<Button ref={buttonRef} onClick={() => setOpen(true)}>
				Hello
			</Button>
			<Popup open={open} anchor={buttonRef.current} onDismiss={() => setOpen(false)}>
				<PopupFrame>This is a popup!</PopupFrame>
			</Popup>
		</div>
	)
}

function PopupDemo() {
	return (
		<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", rowGap: "40vh" }}>
			<MiniPopup />
			<div style={{ justifySelf: "center" }}>
				<MiniPopup />
			</div>
			<div style={{ justifySelf: "end" }}>
				<MiniPopup />
			</div>
			<MiniPopup />
			<div style={{ justifySelf: "center" }}>
				<MiniPopup />
			</div>
			<div style={{ justifySelf: "end" }}>
				<MiniPopup />
			</div>
			<MiniPopup />
			<div style={{ justifySelf: "center" }}>
				<MiniPopup />
			</div>
			<div style={{ justifySelf: "end" }}>
				<MiniPopup />
			</div>
		</div>
	)
}

function DropdownDemo() {
	const buttonRef = useRef<HTMLButtonElement>(null)
	const [open, setOpen] = useState(false)

	const handleDismiss = () => {
		setOpen(false)
		buttonRef.current?.focus()
	}

	return (
		<div>
			<Button ref={buttonRef} onClick={() => setOpen(true)}>
				Hello
			</Button>
			<Popup open={open} anchor={buttonRef.current} onDismiss={handleDismiss}>
				<DropdownMenu>
					<MenuItem
						onClick={() => {
							console.log("Item 1")
							handleDismiss()
						}}
					>
						Item 1
					</MenuItem>
					<MenuItem
						onClick={() => {
							console.log("Item 2")
							handleDismiss()
						}}
					>
						Item 2
					</MenuItem>
					<MenuItem
						onClick={() => {
							console.log("Item 3")
							handleDismiss()
						}}
					>
						Item 3
					</MenuItem>
					<MenuItem
						onClick={() => {
							console.log("Item 4")
							handleDismiss()
						}}
					>
						Item 4
					</MenuItem>
				</DropdownMenu>
			</Popup>
		</div>
	)
}

function ComboBoxDemo() {
	const [value, setValue] = useState<string | undefined>()
	return (
		<div>
			<ComboBoxSelect
				items={fruits}
				value={value}
				onChange={setValue}
				placeholder="Select fruit..."
			/>
		</div>
	)
}

export function FileUploaderDemo() {
	const { uploads, handleDrop } = useFileUpload()
	return (
		<FileUploadDropZone
			onDrop={handleDrop}
			style={{ display: "inline-flex", flexWrap: "wrap", gap: 12, padding: 12 }}
		>
			{uploads.length === 0 && "Drop files here!"}
			{uploads.map((upload) => (
				<UploadPreview key={upload.id} {...upload} />
			))}
		</FileUploadDropZone>
	)
}

// function TokenInput<T, V>(props: {
// 	tokens: T[]
// 	children: [
// 		(token: T, props: { selected: boolean }) => void,
// 		(value: V, props: { selected: boolean }) => void
// 	]

// 	text: string
// 	setText: (text: string) => void

// 	result:
// 		| { loading: true }
// 		| { loading: false; error: string }
// 		| { loading: false; error?: undefined; result: V[] }
// }) {
// 	return (
// 		<div>
// 			<ListBox items={[...props.tokens, "INPUT"]} selectedIndex={props.tokens.length} ></ListBox>

// 			{props.tokens.map((token) => props.children[0](token))}
// 			<span>
// 				<Input
// 					ref={inputRef}
// 					type="text"
// 					value={text}
// 					onChange={(e) => setText(e.target.value)}
// 					onFocus={() => setFocused(true)}
// 					onBlur={() => setFocused(false)}
// 				/>
// 				<Popup open={focused && text.length > 0} anchor={inputRef.current}>
// 					{error ? (
// 						<span style={{ color: "var(--red)" }}>{error}</span>
// 					) : !userIds ? (
// 						<Spinner />
// 					) : userIds.length === 0 ? (
// 						"No results..."
// 					) : (
// 						<ListBox items={userIds}>
// 							{(userId, { focused, selected }) => (
// 								<ListItem focused={focused} selected={selected}>
// 									<Username userId={userId} key={userId} />
// 								</ListItem>
// 							)}
// 						</ListBox>
// 					)}
// 				</Popup>
// 			</span>
// 		</div>
// 	)
// }

const fruits: string[] = [
	"Apple",
	"Banana",
	"Cherry",
	"Date",
	"Elderberry",
	"Fig",
	"Grape",
	"Honeydew",
	"Indian Plum",
	"Jackfruit",
	"Kiwi",
	"Lemon",
	"Mango",
	"Nectarine",
	"Orange",
	"Papaya",
	"Quince",
	"Raspberry",
	"Strawberry",
	"Tangerine",
	"Ugli Fruit",
	"Vitamin C",
	"Watermelon",
	"Xigua",
	"Yellow Passion Fruit",
	"Zucchini",
	"Apricot",
	"Blackberry",
	"Cantaloupe",
	"Dragon Fruit",
	"Eggfruit",
	"Gooseberry",
	"Huckleberry",
	"Jujube",
	"Kumquat",
	"Lychee",
	"Mulberry",
	"Olive",
	"Peach",
	"Pear",
	"Rambutan",
	"Soursop",
	"Tomato",
	"Uva",
	"Vanilla",
	"White Currant",
	"Xoconostle",
	"Yellow Sapote",
	"Zigzag Vine Fruit",
	"Avocado",
]

export function Calendar() {
	const initialDatetime = useMemo(() => {
		const tomorrow = new Date()
		tomorrow.setDate(tomorrow.getDate() + 1)
		tomorrow.setHours(9, 0, 0, 0)

		const tzOffset = tomorrow.getTimezoneOffset() * 60000
		const localISOTime = new Date(tomorrow.getTime() - tzOffset)
		return localISOTime.toISOString().slice(0, "YYYY-MM-DDTHH:MM".length)
	}, [])

	const [datetime, setDatetime] = useState(initialDatetime)

	return (
		<div>
			<input
				type="datetime-local"
				value={datetime}
				onChange={(event) => setDatetime(event.target.value)}
			/>
		</div>
	)
}
