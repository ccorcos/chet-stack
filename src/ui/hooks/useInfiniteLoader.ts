import { useLayoutEffect, useMemo, useRef } from "react"
import { useRefCurrent } from "./useRefCurrent"

const debug = (...args: any[]) => {
	//	console.log(...args)
}

export function useInfiniteLoader(args: {
	scrollRef: React.RefObject<HTMLElement | HTMLDivElement | null>
	/** References elements in the scroller so we can preserve scroll position. */
	firstRef: React.RefObject<HTMLElement | HTMLDivElement | null>
	lastRef: React.RefObject<HTMLElement | HTMLDivElement | null>

	/** The query can contain more data than just this */
	query: { limit: number; reverse: boolean }
	data: any[]

	loadingUp: boolean
	loadingDown: boolean

	/** When dir is undefined, we're just loading a different window size. */
	onLoadMore: (limit: number, dir?: "up" | "down" | undefined) => void
}) {
	const { query, data, loadingDown, loadingUp, onLoadMore, scrollRef, firstRef, lastRef } = args

	const resultCount = data.length
	const desiredScreens = 20

	// Adjust the limit if its too big or too small.
	useLimitAdjuster({
		scrollRef,
		currentLimit: query.limit,
		resultCount,
		desiredScreens,
		onLoadMore,
	})

	usePreserveScrollPosition({
		scrollRef,
		firstRef,
		lastRef,
		data,
	})

	useScrollLoading({
		scrollRef,
		query,
		resultCount,
		desiredScreens,
		loadingUp,
		loadingDown,
		onLoadMore,
	})

	return { scrollRef, firstRef, lastRef }
}

/**
 * On the first render in particular, it's important that we load enough data so that we can
 * scroll. This makes sure we have at least 2 screens of content. If elements vary in height
 * as well, this can become relevant when scrolling from large items to smaller items.
 */
function useLimitAdjuster(args: {
	scrollRef: React.RefObject<HTMLElement | HTMLDivElement | null>
	currentLimit: number
	resultCount: number
	desiredScreens: number
	onLoadMore: (limit: number) => void
}) {
	const { scrollRef, currentLimit, resultCount, desiredScreens } = args

	const onLoadMoreRef = useRefCurrent(args.onLoadMore)

	useLayoutEffect(() => {
		const scrollDiv = scrollRef.current
		if (!scrollDiv) return

		// If we've hit the end of the list, then we don't need to adjust the limit.
		if (resultCount < currentLimit) return

		// We want to make sure there's at least 2 screens of content.
		const minScreens = 2
		const actualScreens = scrollDiv.scrollHeight / scrollDiv.clientHeight
		if (actualScreens > minScreens) return

		// Otherwise we compute the desired limit.
		const newLimit = computeDesiredLimit({ scrollDiv, resultCount, desiredScreens })
		if (newLimit !== currentLimit) onLoadMoreRef.current(newLimit)
	}, [currentLimit, resultCount])
}

function computeDesiredLimit(args: {
	scrollDiv: HTMLElement
	resultCount: number
	desiredScreens: number
}) {
	const { scrollDiv, resultCount, desiredScreens } = args
	const avgHeight = scrollDiv.scrollHeight / resultCount
	const desiredLimit = Math.ceil((scrollDiv.clientHeight / avgHeight) * desiredScreens)
	return desiredLimit
}

/**
 * firstRef and lastRef are supposed to be the first and last elements in the list ensuring
 * that one of those elements remains rendered when data changes.
 * data is only used to trigger React effect deps.
 */
function usePreserveScrollPosition(args: {
	scrollRef: React.RefObject<HTMLElement | HTMLDivElement | null>
	firstRef: React.RefObject<HTMLElement | HTMLDivElement | null>
	lastRef: React.RefObject<HTMLElement | HTMLDivElement | null>
	data: any
}) {
	const { scrollRef, firstRef, lastRef, data } = args

	// Measure scroll position before loading new data.
	const scrollPositionRef = useRef<{ element: HTMLElement; offset: number }[]>([])

	// Take measurement of the previous render when the query changes.
	useMemo(() => {
		const scrollDiv = scrollRef.current
		if (!scrollDiv) return
		debug("MEASURE SCROLL")
		scrollPositionRef.current = [firstRef.current, lastRef.current].filter(Boolean).map((div) => {
			const element = div!
			// Measure distance from top of viewport to the element
			const offset = element.offsetTop - scrollDiv.scrollTop
			return { element, offset }
		})
	}, [data])

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
			// The offset is the distance from top of viewport to the element
			// we want to maintain that same distance after scroll
			scrollDiv.scrollTop = element.offsetTop - offset
			break
		}
	}, [data])
}

export function pickAnchor<T>(list: T[], dir: "up" | "down", limit: number) {
	const oneThird = list.length / 3
	if (dir === "up") {
		// if (list.length < limit / 3) return list[list.length - 1]
		return list[Math.ceil(oneThird)]
	} else {
		// if (list.length < limit / 3) return list[0]
		return list[Math.ceil(oneThird * 2)]
	}
}

function useScrollLoading(args: {
	scrollRef: React.RefObject<HTMLElement | HTMLDivElement | null>
	query: { limit: number; reverse: boolean }
	resultCount: number
	desiredScreens: number
	loadingUp: boolean
	loadingDown: boolean
	onLoadMore: (limit: number, dir?: "up" | "down" | undefined) => void
}) {
	const { scrollRef } = args
	const argsRef = useRefCurrent(args)

	// Adjust the query based on scroll position.
	useLayoutEffect(() => {
		const scrollDiv = scrollRef.current
		if (!scrollDiv) return

		// Keep track of scroll direction.
		let prevScrollTop = scrollDiv.scrollTop
		let scrollingDir: "up" | "down" | undefined = undefined

		const onScroll = () => {
			// Update scroll direction.
			const { query, resultCount, desiredScreens, loadingUp, loadingDown, onLoadMore } =
				argsRef.current
			const { scrollTop, scrollHeight, clientHeight } = scrollDiv

			if (scrollTop > prevScrollTop) scrollingDir = "down"
			else if (scrollTop < prevScrollTop) scrollingDir = "up"
			else scrollingDir === undefined
			prevScrollTop = scrollTop

			// Should we load more?
			const distanceFromBottom = scrollHeight - scrollTop - clientHeight
			const distanceFromTop = scrollTop

			const isAtTop = query.reverse && resultCount < query.limit
			const isAtBottom = !query.reverse && resultCount < query.limit

			const scrollMargin = scrollHeight * 0.15

			// Prevent issues where we optimistically show a subset of the new data which causes an
			// oscilation between loading up and down.
			if (loadingUp || loadingDown) return

			if (
				scrollingDir === "down" &&
				!loadingDown &&
				!isAtBottom &&
				distanceFromBottom < scrollMargin
			) {
				debug("DOWN", distanceFromBottom)
				const newLimit = computeDesiredLimit({ scrollDiv, resultCount, desiredScreens })
				onLoadMore(newLimit, "down")
				return
			}

			if (scrollingDir === "up" && !loadingUp && !isAtTop && distanceFromTop < scrollMargin) {
				debug("UP", distanceFromTop)
				const newLimit = computeDesiredLimit({ scrollDiv, resultCount, desiredScreens })
				onLoadMore(newLimit, "up")
				return
			}
		}

		scrollDiv.addEventListener("scroll", onScroll)
		return () => scrollDiv.removeEventListener("scroll", onScroll)
	}, [scrollRef.current])
}
