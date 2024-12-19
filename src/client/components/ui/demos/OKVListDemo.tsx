import { Suspense, startTransition } from "react"

import React, { useDeferredValue, useRef, useState } from "react"
import { incStr } from "../../../../shared/incStr"
import { setParam } from "../../../../shared/routeHelpers"
import { useInfiniteLoader } from "../../../hooks/useInfiniteLoader"
import { useLoader } from "../../../hooks/useLoader"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { Input } from "../Input"
import { ContentLayout, Layout, LeftPanelLayout } from "../Layout"
import { ListBoxKeyed, ListItem } from "../ListBox"

export function OKVListDemo(props: { params: Record<string, string | undefined> }) {
	const selected = props.params.selected

	return (
		<Layout
			LeftPanel={
				<LeftPanelLayout show={true} style={{ padding: 12 }}>
					<OKVList {...props} />
				</LeftPanelLayout>
			}
		>
			<ContentLayout style={{ padding: 12 }}>
				<OKVDetails selected={selected} />
			</ContentLayout>
		</Layout>
	)
}

function OKVDetails(props: { selected: string | undefined }) {
	if (!props.selected) return <div>No selection.</div>
	// return <OKVSelectedDetails selected={props.selected} />
	return <div>{props.selected}</div>
}

function useOKV(key: string) {
	const { api } = useClientEnvironment()
	const loader = useLoader(["okv:", key], async () => {
		const response = await api.get(key)
		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		return response.body
	})
	const value = loader.suspend()
	return value
}

function OKVSelectedDetails(props: { selected: string }) {
	const deferredSelected = useDeferredValue(props.selected)
	const stale = deferredSelected !== props.selected
	const value = useOKV(deferredSelected)
	console.log("stale", stale)
	return <div style={{ color: stale ? "var(--text-color2)" : "inherit" }}>{value}</div>
}

export function OKVList(props: { params: Record<string, string | undefined> }) {
	const { router } = useClientEnvironment()

	const prefix = useDeferredValue(props.params.prefix || "")

	console.log("prefix", prefix)

	const setPrefix = (prefix: string) => {
		startTransition(() => {
			router.replace(setParam(router.state.url, "prefix", prefix))
		})
	}

	const selected = props.params.selected
	const setSelected = (selected: string) => {
		startTransition(() => {
			console.log("setSelected", selected)
			router.replace(setParam(router.state.url, "selected", selected))
		})
	}

	const { list, pendingUp, pendingDown, staleQuery, scrollRef, firstRef, lastRef } = useOKVList({
		prefix,
		renderCount: 0,
	})

	return (
		<div style={{ display: "flex", flexDirection: "column", maxHeight: "100%", gap: 8 }}>
			<Input placeholder="Search" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
			<div ref={scrollRef} style={{ flexGrow: 1, minHeight: 0, overflowY: "auto" }}>
				<Suspense fallback={<div>Loading...</div>}>
					{pendingUp && <div>Loading...</div>}
					<ListBoxKeyed
						items={list}
						getKey={({ key }) => key}
						selectedKey={selected}
						onSelectKey={setSelected}
						autoFocus={true}
						style={{ color: staleQuery ? "var(--text-color2)" : "inherit" }}
					>
						{(item, props, i) => (
							<ListItem
								ref={i === 0 ? firstRef : i === list.length - 1 ? lastRef : undefined}
								{...props}
							>
								{item.key}
							</ListItem>
						)}
					</ListBoxKeyed>
					{pendingDown && <div>Loading...</div>}
				</Suspense>
			</div>
			<div>Footer</div>
		</div>
	)
}

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

export function useOKVList(props: { prefix: string; renderCount: number }) {
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
	if (query.prefix !== prefix) {
		query = {
			prefix: prefix,
			count: count,
			anchor: prefix,
			limit: defaultLimit,
			reverse: false,
		}
	}
	// Update the cursor when the renderCount changes.
	if (query.count !== count) {
		query = {
			...query,
			count: count,
		}
	}

	const deferredQuery = useDeferredValue(query)
	const staleQuery = deferredQuery !== query

	const list = useListQuery(deferredQuery)
	const deferredListCount = useDeferredValue(list.length)

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
				setQuery({ ...query, anchor: key, limit, reverse: true })
			} else if (dir === "down") {
				const { key } = list[Math.ceil((list.length * 2) / 3)]
				setQuery({ ...query, anchor: key, limit, reverse: false })
			} else {
				setQuery({ ...query, limit })
			}
		},
	})

	return { list, pendingUp, pendingDown, staleQuery, scrollRef, firstRef, lastRef }
}
