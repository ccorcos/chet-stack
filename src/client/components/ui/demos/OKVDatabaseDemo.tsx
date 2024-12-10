import React, { startTransition, useLayoutEffect, useRef, useState } from "react"
import { incStr } from "../../../../shared/incStr"
import { formatRoute, parseRoute } from "../../../../shared/routeHelpers"
import { useCounter } from "../../../hooks/useCounter"
import { useLoader } from "../../../hooks/useLoader"
import { usePref } from "../../../hooks/usePref"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { Input } from "../Input"

const GAP = 12

export function OKVDatabaseDemo(props: { params: Record<string, string> }) {
	const prefix = props.params.prefix || ""

	const { router } = useClientEnvironment()

	const setPrefix = (prefix: string) => {
		startTransition(() => {
			const route = parseRoute(router.state.url)
			if (route.type !== "design") return
			const params: Record<string, string> = { ...route.params, prefix }
			if (prefix === "") delete params.prefix
			const url = formatRoute({ type: "design", params })
			router.replace(url)
		})
	}

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
			<RenderTable key={prefix} prefix={prefix} />
		</div>
	)
}

const PAGE_SIZE = 300

const debug = (...args: any[]) => {
	// console.log(...args)
}

function RenderTable(props: { prefix: string }) {
	const { api } = useClientEnvironment()

	const [columnWidths, setColumnWidths] = usePref("RawDatabase2Demo:columnWidths", [320])

	const [count, rerender] = useCounter()
	const { prefix } = props
	const [anchor, setAnchor] = useState<{ key: string; reverse: boolean }>({
		key: prefix,
		reverse: false,
	})

	const loader = useLoader([anchor.key, anchor.reverse, count], async () => {
		const response = await api.list(
			anchor.reverse
				? { gte: prefix, lte: anchor.key, limit: PAGE_SIZE, reverse: true }
				: { gte: anchor.key, lt: incStr(prefix), limit: PAGE_SIZE }
		)

		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		if (anchor.reverse) return [...response.body].reverse()
		return response.body
	})

	const list = loader.suspend()

	// when the user scrolls down past the 100th item, we want to find that item key and loading the next 300 items.
	// when we're no longer at the beginning of the list (the prefix), then when we scroll up then we want to shift as well.
	const scrollRef = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		const scrollDiv = scrollRef.current
		if (!scrollDiv) return

		const onScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = scrollDiv
			const distanceFromBottom = scrollHeight - scrollTop - clientHeight
			const distanceFromTop = scrollTop

			const isAtTop = anchor.key === prefix || (anchor.reverse && list.length < PAGE_SIZE)
			const isAtBottom = !anchor.reverse && list.length < PAGE_SIZE

			// If we're within 2 viewport heights from the bottom
			if (!isAtBottom && distanceFromBottom < clientHeight * 2) {
				debug("DOWN")
				const anchorIndex = Math.round((list.length * 2) / 3)
				const anchorItem = scrollDiv.querySelector(`[data-index="${anchorIndex}"]`)!
				setAnchor({
					key: anchorItem.getAttribute("data-key")!,
					reverse: false,
				})
				return
			}

			// If we're within 2 viewport heights from the top
			if (!isAtTop && distanceFromTop < clientHeight * 2) {
				debug("UP")
				const anchorIndex = Math.round(list.length / 3)
				const anchorItem = scrollDiv.querySelector(`[data-index="${anchorIndex}"]`)!
				setAnchor({
					key: anchorItem.getAttribute("data-key")!,
					reverse: true,
				})
				return
			}
		}

		scrollDiv.addEventListener("scroll", onScroll)
		return () => scrollDiv.removeEventListener("scroll", onScroll)
	}, [list])

	return (
		<React.Fragment>
			{/* <div>{list.length} results</div> */}

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
					ref={scrollRef}
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
							gap: GAP,
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
						{list.map(({ key, value }, index) => (
							<React.Fragment key={key + count}>
								{/* <div style={{ whiteSpace: "normal", wordBreak: "break-all" }}>{key}</div> */}
								{/* <div style={{ whiteSpace: "normal", wordBreak: "break-all" }}>{value}</div> */}
								<TextInput
									data-index={index}
									data-key={key}
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
						left: `${columnWidths[0] + GAP / 2 - 2}px`,
						width: 4,
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
		</React.Fragment>
	)
}

function TextInput(
	props: {
		value: string
		onSubmit: (value: string) => void
	} & React.HTMLProps<HTMLDivElement>
) {
	const { value, onSubmit, ...rest } = props

	const [draft, setDraft] = useState(value)

	const submit = () => {
		if (draft === value) return
		onSubmit(draft)
	}

	return (
		<ContentEditableInput
			{...rest}
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

function ContentEditableInput(
	props: {
		value: string
		onChange: (value: string) => void
	} & React.HTMLProps<HTMLDivElement>
) {
	const ref = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		if (!ref.current) return
		ref.current.textContent = props.value
	}, [])

	const { value, onChange, style, ...rest } = props

	return (
		<div
			ref={ref}
			{...rest}
			contentEditable
			style={{
				...style,
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
				onChange(e.currentTarget.textContent || "")
			}}
			suppressContentEditableWarning={true}
		></div>
	)
}

// TODO:
// resizable columns
// custom view rendering
// pagination / virtual rendering
// resizable columns
