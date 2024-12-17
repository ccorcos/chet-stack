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

function useListQuery(query: { prefix: string; anchor: string; limit: number; reverse: boolean }) {
	const { api } = useClientEnvironment()

	const loader = useLoader(JSON.stringify(query), async () => {
		const response = await api.list(
			query.reverse
				? { gte: query.prefix, lte: query.anchor, limit: query.limit, reverse: true }
				: { gte: query.anchor, lt: incStr(query.prefix), limit: query.limit }
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
	const [cursor, setCursor] = useState<{ anchor: string; limit: number; reverse: boolean }>({
		anchor: prefix,
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

	const scrollRef = useRef<HTMLDivElement>(null)
	const firstRef = useRef<HTMLDivElement>(null)
	const lastRef = useRef<HTMLDivElement>(null)

	const { pendingUp, pendingDown } = useInfiniteLoader({
		scrollRef,
		firstRef,
		lastRef,
		query: deferredQuery,
		resultCount: deferredListCount,
		onLoadMore: (limit, dir) => {
			if (dir === "up") {
				const { key } = list[Math.ceil(list.length / 3)]
				setCursor({ anchor: key, limit, reverse: true })
			} else if (dir === "down") {
				const { key } = list[Math.ceil((list.length * 2) / 3)]
				setCursor({ anchor: key, limit, reverse: false })
			} else {
				setCursor((cursor) => ({ ...cursor, limit }))
			}
		},
	})

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
					<div
						ref={scrollRef}
						style={{
							overflowY: "auto",
							// Overflow grid with relative for stick headers.
							flex: 1,
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
								<React.Fragment key={key}>
									<TextInput
										ref={index === 0 ? firstRef : index === list.length - 1 ? lastRef : undefined}
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
			</Suspense>
		</div>
	)
}

const debug = (...args: any[]) => {
	console.log(...args)
}

const DESIRED_SCREENS = 20
const DEFAULT_LIMIT = 50

// infiniteloader should just be a hook
// usePreserveScrollPosition accepts a ref.

function useInfiniteLoader(args: {
	scrollRef: React.RefObject<HTMLElement>
	/** References so we can preserve scroll position. */
	firstRef: React.RefObject<HTMLElement>
	lastRef: React.RefObject<HTMLElement>
	/** The query can contain more data than just this. */
	query: { limit: number; reverse: boolean }
	resultCount: number
	/** When dir is undefined, we're just loading a different window size. */
	onLoadMore: (limit: number, dir?: "up" | "down" | undefined) => void
	/** When to signal that the results changed */
	// deps: any[]
}) {
	const [pendingUp, startTransitionUp] = useTransition()
	const [pendingDown, startTransitionDown] = useTransition()
	const { scrollRef, firstRef, lastRef, query, resultCount, onLoadMore } = args

	const computeDesiredLimit = () => {
		const scrollDiv = scrollRef.current
		if (!scrollDiv) return query.limit
		const avgHeight = scrollDiv.scrollHeight / query.limit
		const desiredLimit = Math.ceil((scrollDiv.clientHeight / avgHeight) * DESIRED_SCREENS)
		return desiredLimit
	}

	// Adjust the limit if its too big or too small.
	useLayoutEffect(() => {
		const scrollDiv = scrollRef.current
		if (!scrollDiv) return
		if (resultCount < query.limit) return

		const minScreens = 2
		const actualScreens = scrollDiv.scrollHeight / scrollDiv.clientHeight
		if (actualScreens > minScreens) return

		const newLimit = computeDesiredLimit()
		if (newLimit === query.limit) return

		debug("NEW LIMIT", newLimit)
		if (query.reverse) {
			startTransitionUp(() => onLoadMore(newLimit))
		} else {
			startTransitionDown(() => onLoadMore(newLimit))
		}
	}, [query])
	// Measure scroll position before loading new data
	const scrollPositionRef = useRef<{ element: HTMLElement; offset: number }[]>([])

	// const logScrollPositions = () => {
	// 	return scrollPositionRef.current
	// 		.map(({ element, offset }) => {
	// 			const key = element.getAttribute("data-key")
	// 			return [key, offset]
	// 		})
	// 		.join(", ")
	// }

	// Restore scroll position after new data renders.
	useLayoutEffect(() => {
		const scrollDiv = scrollRef.current
		if (!scrollDiv) return

		const scrollPositions = scrollPositionRef.current
		if (scrollPositions.length === 0) return

		// Restore scroll position after new data renders
		scrollPositionRef.current = []

		for (const { element, offset } of scrollPositions) {
			if (!scrollDiv.contains(element)) continue
			debug("RESTORE SCROLL")
			// offset is the distance from top of viewport to the element
			// we want to maintain that same distance after scroll
			scrollDiv.scrollTop = element.offsetTop - offset
			break
		}
	}, [query])

	// Take measurement of the previous render when the query changes.
	useMemo(() => {
		const scrollDiv = scrollRef.current
		if (!scrollDiv) return
		scrollPositionRef.current = [firstRef.current, lastRef.current].filter(Boolean).map((div) => {
			const element = div!
			// Measure distance from top of viewport to the element
			const offset = element.offsetTop - scrollDiv.scrollTop
			return { element, offset }
		})
		debug("MEASURE SCROLL")
	}, [query])

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
					onLoadMore(computeDesiredLimit(), "down")
				})
				return
			}

			// If we're within 2 viewport heights from the top
			if (scrollingDir === "up" && !pendingUp && !isAtTop && distanceFromTop < margin) {
				startTransitionUp(() => {
					debug("UP", distanceFromTop)
					onLoadMore(computeDesiredLimit(), "up")
				})
				return
			}
		}

		scrollDiv.addEventListener("scroll", onScroll)
		return () => scrollDiv.removeEventListener("scroll", onScroll)
	}, [query, pendingUp, pendingDown])

	return { scrollRef, firstRef, lastRef, pendingUp, pendingDown }
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
