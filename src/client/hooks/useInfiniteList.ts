import { useMemo, useRef, useState } from "react"
import { incStr } from "../../shared/incStr"
import { useList } from "./useDatabase"
import { pickAnchor, useInfiniteLoader } from "./useInfiniteLoader"

type Cursor = { prefix: string; anchor: string; limit: number; reverse: boolean }

function useCursorState(prefix: string, limit = 50) {
	const [cursor, setCursor] = useState<Cursor>({
		prefix: prefix,
		anchor: prefix,
		limit: limit,
		reverse: false,
	})

	const currentCursor = useMemo(() => {
		if (cursor.prefix === prefix) return cursor
		// Reset the cursor when the prefix changes.
		return {
			prefix: prefix,
			anchor: prefix,
			limit: cursor.limit,
			reverse: false,
		}
	}, [prefix, cursor])

	// Make sure we pass the currentCursor to the setCursor function.
	const setCurrentCursor: React.Dispatch<React.SetStateAction<Cursor>> = (arg) => {
		if (typeof arg === "function") {
			setCursor(arg(currentCursor))
		} else {
			setCursor(arg)
		}
	}

	return [currentCursor, setCurrentCursor] as const
}

export function useInfiniteList(args: { prefix: string }) {
	const { prefix } = args
	const [cursor, setCursor] = useCursorState(prefix)

	const { localResult } = useList(
		cursor.reverse
			? { gte: cursor.prefix, lte: cursor.anchor, limit: cursor.limit, reverse: true }
			: { gte: cursor.anchor, lt: incStr(cursor.prefix), limit: cursor.limit }
	)

	const loading = !localResult.hit
	const loadingUp = loading && cursor.reverse
	const loadingDown = loading && !cursor.reverse

	let list = localResult.hit || localResult.prefix || []
	if (cursor.reverse) list = [...list].reverse()

	const scrollRef = useRef<HTMLDivElement>(null)
	const firstRef = useRef<HTMLDivElement>(null)
	const lastRef = useRef<HTMLDivElement>(null)

	useInfiniteLoader({
		scrollRef,
		firstRef,
		lastRef,
		query: cursor,
		data: list,
		loadingUp,
		loadingDown,
		onLoadMore: (limit, dir) => {
			if (dir === "up") {
				// If we're already at the beginning.
				if (!cursor.reverse && prefix === cursor.anchor) return
				const { key } = pickAnchor(list, dir, limit)
				setCursor({ prefix, anchor: key, limit, reverse: true })
			} else if (dir === "down") {
				const { key } = pickAnchor(list, dir, limit)
				setCursor({ prefix, anchor: key, limit, reverse: false })
			} else {
				setCursor({ ...cursor, limit })
			}
		},
	})

	return { list, loading, loadingUp, loadingDown, scrollRef, firstRef, lastRef }
}
