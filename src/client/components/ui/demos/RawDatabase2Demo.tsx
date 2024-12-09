import React, { Suspense, useLayoutEffect, useRef, useState } from "react"
import { incStr } from "../../../../shared/incStr"
import { useCounter } from "../../../hooks/useCounter"
import { useLoader } from "../../../hooks/useLoader"
import { usePref } from "../../../hooks/usePref"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { Input } from "../Input"

export function RawDatabase2Demo() {
	const [prefix, setPrefix] = useState("")

	return (
		<div
			style={{
				// 100% height of ContentLayout, reset overflow to prevent body scroll.
				height: "100%",
				width: "100%",
				overflow: "hidden",

				// Column layout.
				display: "flex",
				flexDirection: "column",
				gap: 12,
			}}
		>
			<Input placeholder="Prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
			<Suspense fallback={<div>Loading...</div>}>
				<RenderTable prefix={prefix} />
			</Suspense>
		</div>
	)
}
function RenderTable(props: { prefix: string }) {
	const { api } = useClientEnvironment()

	const [columnWidths, setColumnWidths] = usePref("RawDatabase2Demo:columnWidths", [320])

	const [count, rerender] = useCounter()
	const { prefix } = props

	const loader = useLoader([prefix, count], async () => {
		const response = await api.list({ gte: prefix, lt: incStr(prefix) })
		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		return response.body
	})

	const list = loader.suspend()

	return (
		<>
			<div>{list.length} results</div>

			<div
				style={{
					// Take up the rest of the space.
					flex: 1,
					overflow: "hidden",

					// Relative for the gutter resizer.
					position: "relative",
					display: "flex",
				}}
			>
				<div
					style={{
						// Overflow grid with relative for stick headers.
						flex: 1,
						overflowY: "auto",
						position: "relative",
					}}
				>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: `${columnWidths[0]}px 1fr`,
							gap: 12,
						}}
					>
						<div
							style={{
								position: "sticky",
								top: 0,
								backgroundColor: "white",
								fontWeight: "bold",
								whiteSpace: "normal",
								wordBreak: "break-all",
								zIndex: 1,
							}}
						>
							key
						</div>
						<div
							style={{
								position: "sticky",
								top: 0,
								backgroundColor: "white",
								fontWeight: "bold",
								whiteSpace: "normal",
								wordBreak: "break-all",
								zIndex: 1,
							}}
						>
							value
						</div>
						{list.map(({ key, value }) => (
							<React.Fragment key={key}>
								{/* <div style={{ whiteSpace: "normal", wordBreak: "break-all" }}>{key}</div> */}
								{/* <div style={{ whiteSpace: "normal", wordBreak: "break-all" }}>{value}</div> */}
								<TextInput
									value={key}
									onSubmit={async (newKey) => {
										await api.write({
											set: [{ key: newKey, value }],
											delete: [key],
										})
										rerender()
									}}
								/>
								<TextInput
									value={value}
									onSubmit={async (newValue) => {
										await api.write({
											set: [{ key, value: newValue }],
										})
										rerender()
									}}
								/>
							</React.Fragment>
						))}
					</div>
				</div>
				<div
					style={{
						position: "absolute",
						top: 0,
						left: `${columnWidths[0]}px`,
						width: "4px",
						bottom: 0,
						cursor: "col-resize",
						backgroundColor: "black",
						userSelect: "none",
					}}
					onMouseDown={(e) => {
						const startX = e.clientX
						const startWidth = columnWidths[0]

						const onMouseMove = (e: MouseEvent) => {
							const delta = e.clientX - startX
							setColumnWidths([Math.max(50, startWidth + delta)])
						}

						const onMouseUp = () => {
							document.removeEventListener("mousemove", onMouseMove)
							document.removeEventListener("mouseup", onMouseUp)
						}

						document.addEventListener("mousemove", onMouseMove)
						document.addEventListener("mouseup", onMouseUp)
					}}
				/>
			</div>
		</>
	)
}

function TextInput(props: {
	value: string
	onSubmit: (value: string) => void
	style?: React.CSSProperties
}) {
	const [draft, setDraft] = useState(props.value)

	const submit = () => {
		if (draft === props.value) return
		props.onSubmit(draft)
	}

	return (
		<ContentEditableInput
			value={draft}
			onChange={(value) => setDraft(value)}
			onBlur={() => {
				submit()
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" && !e.shiftKey) {
					const elm = e.target as HTMLDivElement
					e.preventDefault()
					elm.blur()
				} else if (e.key === "Escape") {
					const elm = e.target as HTMLDivElement
					e.preventDefault()
					elm.blur()
				}
			}}
		/>
	)
}

function ContentEditableInput(props: {
	value: string
	onChange: (value: string) => void
	onBlur?: () => void
	onKeyDown?: (e: React.KeyboardEvent) => void
	style?: React.CSSProperties
}) {
	const ref = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		if (!ref.current) return
		ref.current.textContent = props.value
	}, [])

	return (
		<div
			ref={ref}
			contentEditable
			style={{
				...props.style,
				// whiteSpace: "pre-wrap",
				whiteSpace: "normal",
				wordBreak: "break-all",
				cursor: "text",
				userSelect: "text",
				WebkitUserModify: "read-write-plaintext-only",
			}}
			onPaste={(e) => {
				e.preventDefault()
				const text = e.clipboardData.getData("text/plain")
				document.execCommand("insertText", false, text)
			}}
			onInput={(e) => {
				props.onChange(e.currentTarget.textContent || "")
			}}
			onBlur={props.onBlur}
			onKeyDown={props.onKeyDown}
			suppressContentEditableWarning={true}
		></div>
	)
}

// TODO:
// resizable columns
// custom view rendering
// pagination / virtual rendering
// resizable columns
