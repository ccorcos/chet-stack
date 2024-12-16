import React, {
	Suspense,
	useDeferredValue,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react"
import { incStr } from "../../../../shared/incStr"
import { setParam } from "../../../../shared/routeHelpers"
import { useCounter } from "../../../hooks/useCounter"
import { useLoader } from "../../../hooks/useLoader"
import { usePref } from "../../../hooks/usePref"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { Input } from "../Input"
import { TextInput } from "../TextInput"

const GAP = 12

function useListQuery(query: { prefix: string; key: string; limit: number; reverse: boolean }) {
	const { api } = useClientEnvironment()

	const loader = useLoader(JSON.stringify(query), async () => {
		const response = await api.list(
			query.reverse
				? { gte: query.prefix, lte: query.key, limit: query.limit, reverse: true }
				: { gte: query.key, lt: incStr(query.prefix), limit: query.limit }
		)

		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		if (query.reverse) return [...response.body].reverse()
		return response.body
	})
	const list = loader.suspend()
	return list
}

export function InfiniteLoaderDemo(props: { params: Record<string, string> }) {
	const { router, api } = useClientEnvironment()

	const prefix = props.params.prefix || ""
	const setPrefix = (prefix: string) => {
		const url = setParam(router.state.url, "prefix", prefix === "" ? undefined : prefix)
		router.replace(url)
	}

	const [cursor, setCursor] = useState<{ key: string; limit: number; reverse: boolean }>({
		key: prefix,
		limit: DEFAULT_LIMIT,
		reverse: false,
	})

	const [count, rerender] = useCounter()

	const query = useMemo(() => ({ prefix, count, ...cursor }), [prefix, count, cursor])
	const deferredQuery = useDeferredValue(query)
	const staleQuery = deferredQuery !== query

	const list = useListQuery(deferredQuery)
	const deferredListCount = useDeferredValue(list.length)

	const [columnWidths, setColumnWidths] = usePref("RawDatabase2Demo:columnWidths", [320])

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
					<InfiniteLoader
						query={deferredQuery}
						resultCount={deferredListCount}
						onLoadMore={(limit, dir) => {
							if (dir === "up") {
								const { key } = list[Math.ceil(list.length / 3)]
								setCursor({ key, limit, reverse: true })
							} else if (dir === "down") {
								const { key } = list[Math.ceil((list.length * 2) / 3)]
								setCursor({ key, limit, reverse: false })
							} else {
								setCursor((cursor) => ({ ...cursor, limit }))
							}
						}}
						style={{
							// Overflow grid with relative for stick headers.
							flex: 1,
							position: "relative",
						}}
					>
						{({ pendingUp, pendingDown }) => (
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
											: staleQuery
											? "var(--blue)"
											: "var(--background)",
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
									<React.Fragment key={key + index}>
										<TextInput
											data-index={index}
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
						)}
					</InfiniteLoader>
					<Resizer columnWidths={columnWidths} setColumnWidths={setColumnWidths} />
				</div>
			</Suspense>
		</div>
	)
}

const debug = (...args: any[]) => {
	console.log(...args)
}

const DESIRED_SCREENS = 20
const DEFAULT_LIMIT = 50

function InfiniteLoader<I extends { limit: number; reverse: boolean }>(props: {
	query: I
	resultCount: number
	onLoadMore: (limit: number, dir?: "up" | "down" | undefined) => void
	style?: React.CSSProperties
	children: (args: { pendingUp: boolean; pendingDown: boolean }) => React.ReactNode
}) {
	const [pendingUp, startTransitionUp] = useTransition()
	const [pendingDown, startTransitionDown] = useTransition()
	const scrollRef = useRef<HTMLDivElement>(null)

	const { query, resultCount } = props

	const computeDesiredLimit = () => {
		const scrollDiv = scrollRef.current
		if (!scrollDiv) return query.limit
		const avgHeight = scrollDiv.scrollHeight / query.limit
		const limit = Math.ceil((scrollDiv.clientHeight / avgHeight) * DESIRED_SCREENS)
		return limit
	}

	// Adjust the limit if its too big or too small.
	useLayoutEffect(() => {
		const scrollDiv = scrollRef.current
		if (!scrollDiv) return
		if (resultCount < query.limit) return

		const min = 2

		const actualScreens = scrollDiv.scrollHeight / scrollDiv.clientHeight
		if (actualScreens > min) return

		const newLimit = computeDesiredLimit()
		if (newLimit === query.limit) return

		debug("NEW LIMIT", newLimit)
		if (query.reverse) {
			startTransitionUp(() => props.onLoadMore(newLimit))
		} else {
			startTransitionDown(() => props.onLoadMore(newLimit))
		}
	}, [query])

	// Measure scroll position before loading new data
	const measureRef = useRef<{ element: HTMLElement; offset: number }>()

	useLayoutEffect(() => {
		const scrollDiv = scrollRef.current
		if (!scrollDiv) return

		// Restore scroll position after new data renders
		if (measureRef.current) {
			console.log("RESTORE")
			const { element, offset } = measureRef.current
			measureRef.current = undefined
			const currentScrollTop = element.offsetTop - scrollDiv.scrollTop
			scrollDiv.scrollTop = currentScrollTop - offset
		}
	}, [query])

	// Take measurement on first render
	useMemo(() => {
		const scrollDiv = scrollRef.current
		if (!scrollDiv) return
		console.log("MEASURE")
		const element = scrollDiv.querySelector(
			`[data-index="${Math.round(query.limit / 2)}"]`
		) as HTMLElement
		if (!element) return
		const initialScrollTop = element.offsetTop - scrollDiv.scrollTop
		measureRef.current = { element, offset: initialScrollTop }
	}, [query])

	// // The browser does a good job maintaining scroll position when scrolling down, but has issues
	// // when scrolling up, especially when hitting the top of the scroller.
	// const fixRef = useRef<{ element: HTMLElement; offset: number }>()

	// useLayoutEffect(() => {
	// 	console.log("FIXING")
	// 	const scrollDiv = scrollRef.current
	// 	if (!scrollDiv) return
	// 	// On the render after we measure, fix the scroll position.
	// 	if (fixRef.current) {
	// 		const { element, offset } = fixRef.current
	// 		fixRef.current = undefined
	// 		const currentScrollTop = element.offsetTop - scrollDiv.scrollTop
	// 		debug("FIX", currentScrollTop - offset)
	// 		// scrollDiv.removeEventListener("scroll", onScroll)
	// 		scrollDiv.scrollTop = currentScrollTop - offset
	// 	}
	// }, [props.query])

	// const deferredQuery = useDeferredValue(props.query)
	// const staleQuery = deferredQuery !== props.query

	// useLayoutEffect(() => {
	// 	const scrollDiv = scrollRef.current
	// 	if (!scrollDiv) return

	// 	debug("LISTEN")
	// 	// When we hit the top of the scroller, keep track of where the top element is.
	// 	const onScroll = () => {
	// 		// if (scrollDiv.scrollTop !== 0) return
	// 		// Get element at the middle point of the viewport
	// 		const element = scrollDiv.querySelector(`[data-index="0"]`) as HTMLElement
	// 		console.log("SCROLL", element)
	// 		if (!element) return
	// 		// Get the first visible element and its position before the update
	// 		const initialScrollTop = element.offsetTop - scrollDiv.scrollTop
	// 		debug("MEASURE", initialScrollTop)
	// 		fixRef.current = { element, offset: initialScrollTop }
	// 	}

	// 	scrollDiv.addEventListener("scroll", onScroll)
	// 	return () => scrollDiv.removeEventListener("scroll", onScroll)
	// }, [query])

	// Adjust the query based on scroll position.
	useLayoutEffect(() => {
		const scrollDiv = scrollRef.current
		if (!scrollDiv) return

		let prev = scrollDiv.scrollTop
		let scrollingDir: "up" | "down" | undefined = undefined

		const onScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = scrollDiv

			if (scrollTop > prev) scrollingDir = "down"
			else if (scrollTop < prev) scrollingDir = "up"
			else scrollingDir === undefined
			prev = scrollTop

			const distanceFromBottom = scrollHeight - scrollTop - clientHeight
			const distanceFromTop = scrollTop

			const isAtTop = query.reverse && resultCount < query.limit
			const isAtBottom = !query.reverse && resultCount < query.limit

			const margin = (scrollHeight - clientHeight * 2) * 0.15

			if (scrollingDir === "down" && !pendingDown && !isAtBottom && distanceFromBottom < margin) {
				startTransitionDown(() => {
					debug("DOWN")
					props.onLoadMore(computeDesiredLimit(), "down")
				})
				return
			}

			// If we're within 2 viewport heights from the top
			if (scrollingDir === "up" && !pendingUp && !isAtTop && distanceFromTop < margin) {
				startTransitionUp(() => {
					debug("UP", distanceFromTop)
					props.onLoadMore(computeDesiredLimit(), "up")
				})
				return
			}
		}

		scrollDiv.addEventListener("scroll", onScroll)
		return () => scrollDiv.removeEventListener("scroll", onScroll)
	}, [query, pendingUp, pendingDown])

	return (
		<div ref={scrollRef} style={{ ...props.style, overflowY: "auto" }}>
			{props.children({ pendingUp, pendingDown })}
		</div>
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
