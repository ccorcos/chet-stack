import React, { Suspense, useDeferredValue, useMemo, useRef, useState } from "react"
import { incStr } from "../../../../shared/incStr"
import { setParam } from "../../../../shared/routeHelpers"
import { useCounter } from "../../../hooks/useCounter"
import { useInfiniteLoader } from "../../../hooks/useInfiniteLoader"
import { useLoader } from "../../../hooks/useLoader"
import { usePref } from "../../../hooks/usePref"
import { useClientEnvironment } from "../../../services/ClientEnvironment"
import { Input } from "../Input"
import { HeaderCell, Table } from "../Table"
import { TextInput } from "../TextInput"

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

const gap = 12
const minWidth = 150
const defaultLimit = 50

export function OKVDatabaseDemo(props: { params: Record<string, string> }) {
	const { router, api } = useClientEnvironment()

	const prefix = props.params.prefix || ""
	const setPrefix = (prefix: string) => {
		const url = setParam(router.state.url, "prefix", prefix === "" ? undefined : prefix)
		router.replace(url)
		setCursor(({ limit }) => ({ anchor: prefix, limit, reverse: false }))
	}

	const [cursor, setCursor] = useState<{ anchor: string; limit: number; reverse: boolean }>({
		anchor: prefix,
		limit: defaultLimit,
		reverse: false,
	})

	const [count, rerender] = useCounter()
	const query = useMemo(() => ({ prefix, count, ...cursor }), [prefix, count, cursor])

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
				setCursor({ anchor: key, limit, reverse: true })
			} else if (dir === "down") {
				const { key } = list[Math.ceil((list.length * 2) / 3)]
				setCursor({ anchor: key, limit, reverse: false })
			} else {
				setCursor((cursor) => ({ ...cursor, limit }))
			}
		},
	})

	const [columnWidths, setColumnWidths] = usePref("RawDatabase2Demo:columnWidths2", [300, 300])

	const setWidth = (index: number) => (width: number) => {
		const newWidths = [...columnWidths]
		newWidths[index] = width
		setColumnWidths(newWidths)
	}

	const backgroundColor = pendingUp
		? "var(--red)"
		: pendingDown
		? "var(--green)"
		: staleQuery
		? "var(--blue)"
		: "var(--background)"

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
				gap,
				padding: 12,
			}}
		>
			<Input placeholder="Prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
			<Suspense fallback={<div>Loading...</div>}>
				<Table
					ref={scrollRef}
					gap={gap}
					columnWidths={columnWidths}
					setColumnWidths={setColumnWidths}
				>
					<HeaderCell
						gap={gap}
						width={columnWidths[0]}
						minWidth={minWidth}
						setWidth={setWidth(0)}
						style={{
							backgroundColor,
							fontWeight: "bold",
							whiteSpace: "normal",
							wordBreak: "break-all",
						}}
					>
						Key
					</HeaderCell>
					<HeaderCell
						gap={gap}
						width={columnWidths[1]}
						minWidth={minWidth}
						setWidth={setWidth(1)}
						style={{
							backgroundColor,
							fontWeight: "bold",
							whiteSpace: "normal",
							wordBreak: "break-all",
						}}
					>
						Value
					</HeaderCell>
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
				</Table>
			</Suspense>
		</div>
	)
}
