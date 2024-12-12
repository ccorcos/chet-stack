import React, { Suspense, useLayoutEffect, useRef, useState, useTransition } from "react"
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
		const route = parseRoute(router.state.url)
		if (route.type !== "design") return
		const params: Record<string, string> = { ...route.params, prefix }
		if (prefix === "") delete params.prefix
		const url = formatRoute({ type: "design", params })
		router.replace(url)
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
			<Suspense fallback={<div>Loading...</div>}>
				<RenderTable prefix={prefix} />
			</Suspense>
		</div>
	)
}

const debug = (...args: any[]) => {
	// console.log(...args)
}

function RenderTable(props: { prefix: string }) {
	// const { prefix } = props
	const { api } = useClientEnvironment()

	const [count, rerender] = useCounter()
	const [columnWidths, setColumnWidths] = usePref("RawDatabase2Demo:columnWidths", [320])

	const [pendingSearch, startTransitionSearch] = useTransition()
	const [pendingUp, startTransitionUp] = useTransition()
	const [pendingDown, startTransitionDown] = useTransition()

	// Update the state with the prefix. We do this so that we can render the transition inside
	// this component and persist the scroller element.
	const [prefix, setPrefix] = useState(props.prefix)
	useLayoutEffect(() => {
		startTransitionSearch(() => {
			setPrefix(props.prefix)
			setAnchor(({ limit }) => ({
				key: props.prefix,
				limit,
				reverse: false,
			}))
		})
	}, [props.prefix])

	const [anchor, setAnchor] = useState<{ key: string; reverse: boolean; limit: number }>({
		key: prefix,
		// Inital request can use a small limit since we'll measure and adjust.
		limit: 50,
		reverse: false,
	})

	const loader = useLoader([prefix, anchor.key, anchor.reverse, anchor.limit, count], async () => {
		const response = await api.list(
			anchor.reverse
				? { gte: prefix, lte: anchor.key, limit: anchor.limit, reverse: true }
				: { gte: anchor.key, lt: incStr(prefix), limit: anchor.limit }
		)

		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		if (anchor.reverse) return [...response.body].reverse()
		return response.body
	})

	const list = loader.suspend()

	const scrollRef = useRef<HTMLDivElement>(null)

	// Adjust the limit size based on rendered items.
	useLayoutEffect(() => {
		const scrollDiv = scrollRef.current
		if (!scrollDiv) return
		if (list.length < anchor.limit) return

		const desiredScreens = 20
		const min = desiredScreens - 2
		const max = desiredScreens + 2

		const actualScreens = scrollDiv.scrollHeight / scrollDiv.clientHeight
		if (actualScreens > min && actualScreens < max) return

		const avgHeight = scrollDiv.scrollHeight / anchor.limit
		const newLimit = Math.ceil((scrollDiv.clientHeight / avgHeight) * desiredScreens)
		if (newLimit === anchor.limit) return

		const startTransition = anchor.reverse ? startTransitionUp : startTransitionDown
		startTransition(() => {
			debug("NEW LIMIT", newLimit)
			setAnchor((a) => ({ ...a, limit: newLimit }))
		})
	}, [list])

	// The browser does a good job maintaining scroll position when scrolling down, but has issues
	// when scrolling up, especially when hitting the top of the scroller.
	const fixRef = useRef<{ element: HTMLElement; offset: number }>()

	useLayoutEffect(() => {
		const scrollDiv = scrollRef.current
		if (!scrollDiv) return

		// On the render after we measure, fix the scroll position.
		if (fixRef.current) {
			const { element, offset } = fixRef.current
			fixRef.current = undefined
			const currentScrollTop = element.offsetTop - scrollDiv.scrollTop
			debug("FIX", currentScrollTop - offset)
			// scrollDiv.removeEventListener("scroll", onScroll)
			scrollDiv.scrollTop = currentScrollTop - offset
		}

		if (!pendingUp) return
		debug("LISTEN")

		// When we hit the top of the scroller, keep track of where the top element is.
		const onScroll = () => {
			if (scrollDiv.scrollTop !== 0) return
			const element = scrollDiv.querySelector(`[data-index="0"]`) as HTMLElement
			if (!element) return
			// Get the first visible element and its position before the update
			const initialScrollTop = element.offsetTop - scrollDiv.scrollTop
			debug("MEASURE", initialScrollTop)
			fixRef.current = { element, offset: initialScrollTop }
		}

		scrollDiv.addEventListener("scroll", onScroll)
		return () => scrollDiv.removeEventListener("scroll", onScroll)
	}, [list, pendingUp])

	// Adjust the anchor query based on scroll position.
	useLayoutEffect(() => {
		const scrollDiv = scrollRef.current
		if (!scrollDiv) return

		const PAGE_SIZE = anchor.limit

		const onScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = scrollDiv
			const distanceFromBottom = scrollHeight - scrollTop - clientHeight
			const distanceFromTop = scrollTop

			const isAtTop = anchor.key === prefix || (anchor.reverse && list.length < PAGE_SIZE)
			const isAtBottom = !anchor.reverse && list.length < PAGE_SIZE

			// const margin = clientHeight * 2
			const margin = (scrollHeight - clientHeight * 2) * 0.15

			// If we're within 2 viewport heights from the bottom
			if (!pendingDown && !isAtBottom && distanceFromBottom < margin) {
				const anchorIndex = Math.round((list.length * 2) / 3)
				const anchorItem = scrollDiv.querySelector(`[data-index="${anchorIndex}"]`)!
				startTransitionDown(() => {
					debug("DOWN")
					setAnchor({
						key: anchorItem.getAttribute("data-key")!,
						limit: PAGE_SIZE,
						reverse: false,
					})
				})
				return
			}

			// If we're within 2 viewport heights from the top
			if (!pendingUp && !isAtTop && distanceFromTop < margin) {
				const anchorIndex = Math.round(list.length / 3)
				const anchorItem = scrollDiv.querySelector(`[data-index="${anchorIndex}"]`)!

				startTransitionUp(() => {
					debug("UP", distanceFromTop)
					setAnchor({
						key: anchorItem.getAttribute("data-key")!,
						limit: PAGE_SIZE,
						reverse: true,
					})
				})
				return
			}
		}

		if (scrollDiv.scrollTop === 0 && anchor.key !== prefix) onScroll()

		scrollDiv.addEventListener("scroll", onScroll)
		return () => scrollDiv.removeEventListener("scroll", onScroll)
	}, [list, pendingUp, pendingDown])

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
								backgroundColor: pendingUp
									? "var(--red)"
									: pendingDown
									? "var(--green)"
									: pendingSearch
									? "var(--blue)"
									: "var(--background)",
								// backgroundColor: "var(--background)",
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
								backgroundColor: "var(--background)",
								fontWeight: "bold",
								whiteSpace: "normal",
								wordBreak: "break-all",
								zIndex: 1,
							}}
						>
							value
						</div>
						<>
							<div key="up">{pendingUp ? "Loading..." : ""}</div>
							<div key="up2" />
						</>

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
									style={{ maxHeight: 300, overflowY: "auto" }}
								/>
							</React.Fragment>
						))}
						<>
							<div key="down">{pendingDown ? "Loading..." : ""}</div>
							<div key="down2" />
						</>
					</div>
				</div>
				<Resizer columnWidths={columnWidths} setColumnWidths={setColumnWidths} />
			</div>
		</React.Fragment>
	)
}

function useHover() {
	const [hover, setHover] = useState(false)

	return [
		hover,
		{ onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) },
	] as const
}

function Resizer(props: { columnWidths: number[]; setColumnWidths: (value: number[]) => void }) {
	const { columnWidths, setColumnWidths } = props

	const lineWidth = Math.floor(GAP * 0.7)
	const [hover, hoverProps] = useHover()
	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				left: `${columnWidths[0] + GAP / 2 - lineWidth / 2}px`,
				width: lineWidth,
				bottom: 0,
				cursor: "col-resize",
				userSelect: "none",
				display: "flex",
				justifyContent: "center",
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
			{...hoverProps}
		>
			<div
				style={{
					width: 1,
					height: "100%",
					backgroundColor: "var(--text-color)",
					boxShadow: hover ? `0 0 3px 1px var(--text-color)` : "none",
					transition: "box-shadow 0.2s ease-in-out",
				}}
			/>
		</div>
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
