import { useLayoutEffect, useMemo } from "react"

import { useRef, useTransition } from "react"

const debug = (...args: any[]) => {
	// console.log(...args)
}

export function useInfiniteLoader(args: {
	scrollRef: React.RefObject<HTMLElement>
	/** References elements in the scroller so we can preserve scroll position. */
	firstRef: React.RefObject<HTMLElement>
	lastRef: React.RefObject<HTMLElement>

	/** The query can contain more data than just this */
	query: { limit: number; reverse: boolean }
	resultCount: number

	/** When dir is undefined, we're just loading a different window size. */
	onLoadMore: (limit: number, dir?: "up" | "down" | undefined) => void

	/** The number of screens of content to load. */
	desiredScreensOfContent?: number
}) {
	const [pendingUp, startTransitionUp] = useTransition()
	const [pendingDown, startTransitionDown] = useTransition()
	const { query, resultCount, onLoadMore, scrollRef, firstRef, lastRef } = args

	const desiredScreens = args.desiredScreensOfContent ?? 20

	const computeDesiredLimit = () => {
		const scrollDiv = scrollRef.current
		if (!scrollDiv) return query.limit
		const avgHeight = scrollDiv.scrollHeight / resultCount
		const desiredLimit = Math.ceil((scrollDiv.clientHeight / avgHeight) * desiredScreens)
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
			const scrollMargin = scrollHeight * 0.15

			if (
				scrollingDir === "down" &&
				!pendingDown &&
				!isAtBottom &&
				distanceFromBottom < scrollMargin
			) {
				startTransitionDown(() => {
					debug("DOWN")
					onLoadMore(computeDesiredLimit(), "down")
				})
				return
			}

			// If we're within 2 viewport heights from the top
			if (scrollingDir === "up" && !pendingUp && !isAtTop && distanceFromTop < scrollMargin) {
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
