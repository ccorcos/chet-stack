import { useDeferredValue, useLayoutEffect, useRef, useTransition } from "react"

import { useState } from "react"
import { incStr } from "../../shared/incStr"
import { useClientEnvironment } from "../services/ClientEnvironment"
import { useInfiniteLoader } from "./useInfiniteLoader"
import { useLoader } from "./useLoader"

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

const defaultLimit = 50

export function useRemoteList(props: { prefix: string; renderCount: number }) {
	const { prefix } = props

	const count = props.renderCount

	let [query, setQuery] = useState({
		prefix: prefix,
		count: props.renderCount,
		anchor: prefix,
		limit: defaultLimit,
		reverse: false,
	})

	// Reset the cursor when the prefix changes
	useLayoutEffect(() => {
		if (query.prefix === prefix) return
		setQuery({
			prefix: prefix,
			count: count,
			anchor: prefix,
			limit: defaultLimit,
			reverse: false,
		})
	}, [prefix])

	// Update the cursor when the renderCount changes.
	useLayoutEffect(() => {
		if (query.count === count) return
		setQuery({
			...query,
			count: count,
		})
	}, [count])

	const deferredQuery = useDeferredValue(query)
	const staleQuery = deferredQuery !== query

	const list = useListQuery(deferredQuery)
	const deferredList = useDeferredValue(list)

	const scrollRef = useRef<HTMLDivElement>(null)
	const firstRef = useRef<HTMLDivElement>(null)
	const lastRef = useRef<HTMLDivElement>(null)

	const [loadingUp, startTransitionUp] = useTransition()
	const [loadingDown, startTransitionDown] = useTransition()

	useInfiniteLoader({
		scrollRef,
		firstRef,
		lastRef,
		loadingUp,
		loadingDown,
		query: deferredQuery,
		data: deferredList,
		onLoadMore: (limit, dir) => {
			const startTransition =
				dir === "up" || (dir === undefined && deferredQuery.reverse)
					? startTransitionUp
					: startTransitionDown
			startTransition(() => {
				if (dir === "up") {
					const { key } = list[Math.ceil(list.length / 3)]
					setQuery({ ...query, anchor: key, limit, reverse: true })
				} else if (dir === "down") {
					const { key } = list[Math.ceil((list.length * 2) / 3)]
					setQuery({ ...query, anchor: key, limit, reverse: false })
				} else {
					setQuery({ ...query, limit })
				}
			})
		},
	})

	return { list, loadingUp, loadingDown, staleQuery, scrollRef, firstRef, lastRef }
}
